import { Injectable } from "@nestjs/common";
import type { CreateServiceInput, UpdateServiceInput } from "@sitetrack/shared-types";
import { writeAuditLog } from "../common/audit/write-audit-log";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.db.service.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  get(id: string) {
    return this.prisma.db.service.findUnique({ where: { id } });
  }

  async create(dto: CreateServiceInput, actorUserId: string) {
    const organizationId = this.prisma.organizationId;
    const service = await this.prisma.db.service.create({ data: { ...dto, organizationId } });

    await writeAuditLog(this.prisma.db, {
      organizationId,
      entityType: "Service",
      entityId: service.id,
      action: "CREATE",
      actorUserId,
      after: service,
    });

    return service;
  }

  async update(id: string, dto: UpdateServiceInput, actorUserId: string) {
    const before = await this.prisma.db.service.findUnique({ where: { id } });
    const service = await this.prisma.db.service.update({ where: { id }, data: dto });

    await writeAuditLog(this.prisma.db, {
      organizationId: this.prisma.organizationId,
      entityType: "Service",
      entityId: id,
      action: "UPDATE",
      actorUserId,
      before,
      after: service,
    });

    return service;
  }

  /**
   * Soft delete (isActive: false), matching list()'s filter -- historical
   * bookings still reference the service row, so this can't be a hard delete.
   */
  async remove(id: string, actorUserId: string) {
    const before = await this.prisma.db.service.findUnique({ where: { id } });
    const service = await this.prisma.db.service.update({ where: { id }, data: { isActive: false } });

    await writeAuditLog(this.prisma.db, {
      organizationId: this.prisma.organizationId,
      entityType: "Service",
      entityId: id,
      action: "DELETE",
      actorUserId,
      before,
      after: service,
    });

    return { id: service.id };
  }
}
