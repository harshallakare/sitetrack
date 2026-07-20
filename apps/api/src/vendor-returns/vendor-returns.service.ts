import { Injectable, NotFoundException } from "@nestjs/common";
import { toMinorUnits } from "@sitetrack/shared-types";
import type { CreateVendorReturnInput, UpdateVendorReturnInput } from "@sitetrack/shared-types";
import { writeAuditLog } from "../common/audit/write-audit-log";
import { PrismaService } from "../prisma/prisma.service";

const RETURN_INCLUDE = {
  vendor: true,
  site: true,
  lineItems: { include: { item: true } },
} as const;

@Injectable()
export class VendorReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  list(params: { siteId?: string; vendorId?: string } = {}) {
    return this.prisma.db.vendorReturn.findMany({
      where: {
        ...(params.siteId ? { siteId: params.siteId } : {}),
        ...(params.vendorId ? { vendorId: params.vendorId } : {}),
      },
      include: RETURN_INCLUDE,
      orderBy: { returnDate: "desc" },
    });
  }

  get(id: string) {
    return this.prisma.db.vendorReturn.findUnique({ where: { id }, include: RETURN_INCLUDE });
  }

  async create(dto: CreateVendorReturnInput, createdByUserId: string) {
    const organizationId = this.prisma.organizationId;

    // Fetching through the scoped client (not a raw FK check) is what
    // actually proves tenant ownership -- see DeliveriesService.create.
    const site = await this.prisma.db.site.findUnique({ where: { id: dto.siteId } });
    if (!site) throw new NotFoundException("Site not found");

    const vendor = await this.prisma.db.vendor.findUnique({ where: { id: dto.vendorId } });
    if (!vendor) throw new NotFoundException("Vendor not found");

    const itemIds = [...new Set(dto.lineItems.map((li) => li.itemId))];
    const items = await this.prisma.db.item.findMany({ where: { id: { in: itemIds } } });
    if (items.length !== itemIds.length) {
      throw new NotFoundException("One or more items were not found in this organization");
    }

    const vendorReturn = await this.prisma.db.$transaction(async (tx) => {
      const created = await tx.vendorReturn.create({
        data: {
          organizationId,
          siteId: dto.siteId,
          vendorId: dto.vendorId,
          returnDate: dto.returnDate,
          reason: dto.reason,
          notes: dto.notes,
          createdByUserId,
        },
      });

      await tx.vendorReturnLineItem.createMany({
        data: dto.lineItems.map((line) => {
          const unitPriceMinor = toMinorUnits(line.unitPrice);
          return {
            organizationId,
            vendorReturnId: created.id,
            itemId: line.itemId,
            vendorId: dto.vendorId,
            quantity: line.quantity,
            unitPriceMinor,
            lineTotalMinor: Math.round(line.quantity * unitPriceMinor),
          };
        }),
      });

      await writeAuditLog(tx, {
        organizationId,
        entityType: "VendorReturn",
        entityId: created.id,
        action: "CREATE",
        actorUserId: createdByUserId,
        after: created,
      });

      return created;
    });

    return this.get(vendorReturn.id);
  }

  async update(id: string, dto: UpdateVendorReturnInput, actorUserId: string) {
    const before = await this.prisma.db.vendorReturn.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Vendor return not found");

    const vendorReturn = await this.prisma.db.vendorReturn.update({ where: { id }, data: dto });

    await writeAuditLog(this.prisma.db, {
      organizationId: this.prisma.organizationId,
      entityType: "VendorReturn",
      entityId: id,
      action: "UPDATE",
      actorUserId,
      before,
      after: vendorReturn,
    });

    return this.get(id);
  }

  /** Deleting a return cascades to its line items (schema onDelete: Cascade). */
  async remove(id: string, actorUserId: string) {
    const before = await this.prisma.db.vendorReturn.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Vendor return not found");

    await this.prisma.db.$transaction(async (tx) => {
      await tx.vendorReturn.delete({ where: { id } });
      await writeAuditLog(tx, {
        organizationId: this.prisma.organizationId,
        entityType: "VendorReturn",
        entityId: id,
        action: "DELETE",
        actorUserId,
        before,
      });
    });

    return { id };
  }
}
