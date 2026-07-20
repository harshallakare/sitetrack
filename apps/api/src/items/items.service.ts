import { Injectable } from "@nestjs/common";
import type { CreateItemInput, UpdateItemInput } from "@sitetrack/shared-types";
import { writeAuditLog } from "../common/audit/write-audit-log";
import { PrismaService } from "../prisma/prisma.service";
import { TagsService } from "../tags/tags.service";

const TAG_INCLUDE = { tags: { include: { tag: true } } } as const;

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tagsService: TagsService
  ) {}

  list() {
    return this.prisma.db.item.findMany({
      where: { isActive: true },
      include: TAG_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  get(id: string) {
    return this.prisma.db.item.findUnique({ where: { id }, include: TAG_INCLUDE });
  }

  /**
   * Bulk stats for ALL items in one groupBy -- the items page renders every
   * item's totals, and calling the per-item endpoint N times was an N+1 over
   * HTTP (119 requests for the standard catalog).
   */
  async getAllDeliveryStats(): Promise<Record<string, { totalDelivered: number; avgUnitPriceMinor: number }>> {
    const grouped = await this.prisma.db.deliveryLineItem.groupBy({
      by: ["itemId"],
      _sum: { quantity: true },
      _avg: { unitPriceMinor: true },
    });
    return Object.fromEntries(
      grouped.map((g) => [
        g.itemId,
        {
          totalDelivered: g._sum.quantity ?? 0,
          avgUnitPriceMinor: Math.round(g._avg.unitPriceMinor ?? 0),
        },
      ])
    );
  }

  /** Total delivered quantity and avg unit price per item, computed on the fly (see plan doc: no stored/staleness-prone aggregate columns). */
  async getDeliveryStats(id: string) {
    const aggregate = await this.prisma.db.deliveryLineItem.aggregate({
      where: { itemId: id },
      _sum: { quantity: true },
      _avg: { unitPriceMinor: true },
    });
    return {
      totalDelivered: aggregate._sum.quantity ?? 0,
      avgUnitPriceMinor: Math.round(aggregate._avg.unitPriceMinor ?? 0),
    };
  }

  async create(dto: CreateItemInput, actorUserId: string) {
    const { tagNames, ...rest } = dto;
    const organizationId = this.prisma.organizationId;
    const item = await this.prisma.db.item.create({ data: { ...rest, organizationId } });

    const tagIds = await this.tagsService.resolveTagIds(tagNames);
    if (tagIds.length > 0) {
      await this.prisma.db.itemTag.createMany({
        data: tagIds.map((tagId) => ({ itemId: item.id, tagId, organizationId })),
      });
    }

    await writeAuditLog(this.prisma.db, {
      organizationId,
      entityType: "Item",
      entityId: item.id,
      action: "CREATE",
      actorUserId,
      after: item,
    });

    return this.get(item.id);
  }

  /**
   * Soft delete (isActive: false), matching list()'s filter -- historical
   * deliveries still reference the item row, so this can't be a hard delete.
   */
  async remove(id: string, actorUserId: string) {
    const before = await this.prisma.db.item.findUnique({ where: { id } });
    const item = await this.prisma.db.item.update({ where: { id }, data: { isActive: false } });

    await writeAuditLog(this.prisma.db, {
      organizationId: this.prisma.organizationId,
      entityType: "Item",
      entityId: id,
      action: "DELETE",
      actorUserId,
      before,
      after: item,
    });

    return { id: item.id };
  }

  /** Item info + delivery stats/history for the item detail page. */
  async getDetail(id: string) {
    const item = await this.get(id);
    if (!item) return null;

    const lineItems = await this.prisma.db.deliveryLineItem.findMany({
      where: { itemId: id },
      include: {
        delivery: { include: { vendor: true, site: true } },
      },
      orderBy: { delivery: { deliveryDate: "desc" } },
    });

    const prices = lineItems.map((li) => li.unitPriceMinor);
    const totalDelivered = lineItems.reduce((sum, li) => sum + li.quantity, 0);
    const totalDeliveries = new Set(lineItems.map((li) => li.deliveryId)).size;

    return {
      item,
      stats: {
        totalDeliveries,
        totalDelivered,
        avgUnitPriceMinor: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
        minUnitPriceMinor: prices.length ? Math.min(...prices) : 0,
        maxUnitPriceMinor: prices.length ? Math.max(...prices) : 0,
      },
      history: lineItems.map((li) => ({
        id: li.id,
        deliveryId: li.deliveryId,
        date: li.delivery.deliveryDate,
        vendorName: li.delivery.vendor.companyName ?? li.delivery.vendor.contactPerson,
        siteName: li.delivery.site.name,
        quantity: li.quantity,
        unitPriceMinor: li.unitPriceMinor,
        lineTotalMinor: li.lineTotalMinor,
      })),
    };
  }

  async update(id: string, dto: UpdateItemInput, actorUserId: string) {
    const { tagNames, ...rest } = dto;
    const before = await this.prisma.db.item.findUnique({ where: { id } });
    const item = await this.prisma.db.item.update({ where: { id }, data: rest });

    if (tagNames) {
      const organizationId = this.prisma.organizationId;
      await this.prisma.db.itemTag.deleteMany({ where: { itemId: id } });
      const tagIds = await this.tagsService.resolveTagIds(tagNames);
      if (tagIds.length > 0) {
        await this.prisma.db.itemTag.createMany({
          data: tagIds.map((tagId) => ({ itemId: id, tagId, organizationId })),
        });
      }
    }

    await writeAuditLog(this.prisma.db, {
      organizationId: this.prisma.organizationId,
      entityType: "Item",
      entityId: id,
      action: "UPDATE",
      actorUserId,
      before,
      after: item,
    });

    return this.get(id);
  }
}
