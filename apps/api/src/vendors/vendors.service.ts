import { Injectable } from "@nestjs/common";
import type { CreateVendorInput, UpdateVendorInput } from "@sitetrack/shared-types";
import { writeAuditLog } from "../common/audit/write-audit-log";
import { PrismaService } from "../prisma/prisma.service";
import { TagsService } from "../tags/tags.service";

const TAG_INCLUDE = { tags: { include: { tag: true } } } as const;

@Injectable()
export class VendorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tagsService: TagsService
  ) {}

  list() {
    return this.prisma.db.vendor.findMany({
      where: { isActive: true },
      include: TAG_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  get(id: string) {
    return this.prisma.db.vendor.findUnique({ where: { id }, include: TAG_INCLUDE });
  }

  async create(dto: CreateVendorInput, actorUserId: string) {
    const { tagNames, ...rest } = dto;
    const organizationId = this.prisma.organizationId;
    const vendor = await this.prisma.db.vendor.create({ data: { ...rest, organizationId } });

    const tagIds = await this.tagsService.resolveTagIds(tagNames);
    if (tagIds.length > 0) {
      await this.prisma.db.vendorTag.createMany({
        data: tagIds.map((tagId) => ({ vendorId: vendor.id, tagId, organizationId })),
      });
    }

    await writeAuditLog(this.prisma.db, {
      organizationId,
      entityType: "Vendor",
      entityId: vendor.id,
      action: "CREATE",
      actorUserId,
      after: vendor,
    });

    return this.get(vendor.id);
  }

  async update(id: string, dto: UpdateVendorInput, actorUserId: string) {
    const { tagNames, ...rest } = dto;
    const before = await this.prisma.db.vendor.findUnique({ where: { id } });
    const vendor = await this.prisma.db.vendor.update({ where: { id }, data: rest });

    if (tagNames) {
      const organizationId = this.prisma.organizationId;
      await this.prisma.db.vendorTag.deleteMany({ where: { vendorId: id } });
      const tagIds = await this.tagsService.resolveTagIds(tagNames);
      if (tagIds.length > 0) {
        await this.prisma.db.vendorTag.createMany({
          data: tagIds.map((tagId) => ({ vendorId: id, tagId, organizationId })),
        });
      }
    }

    await writeAuditLog(this.prisma.db, {
      organizationId: this.prisma.organizationId,
      entityType: "Vendor",
      entityId: id,
      action: "UPDATE",
      actorUserId,
      before,
      after: vendor,
    });

    return this.get(id);
  }
}
