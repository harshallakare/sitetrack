import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reads the audit trail (auto-captured on create/update/delete of
   * Vendor/Item/Delivery/Payment/Account) for the current org, resolving the
   * actor's name. Optionally filtered to a single entity for a per-record
   * "Activity" tab. AuditLog is tenant-scoped by the Prisma extension.
   */
  async list(params: { entityType?: string; entityId?: string; limit?: number }) {
    const limit = Math.min(params.limit ?? 50, 200);

    const logs = await this.prisma.db.auditLog.findMany({
      where: {
        ...(params.entityType ? { entityType: params.entityType } : {}),
        ...(params.entityId ? { entityId: params.entityId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const actorIds = [...new Set(logs.map((l) => l.actorUserId).filter((v): v is string => !!v))];
    const actors = actorIds.length
      ? await this.prisma.unscoped.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true },
        })
      : [];
    const actorName = new Map(actors.map((a) => [a.id, a.name]));

    return logs.map((l) => ({
      id: l.id,
      entityType: l.entityType,
      entityId: l.entityId,
      action: l.action,
      actorName: l.actorUserId ? (actorName.get(l.actorUserId) ?? "Unknown") : "System",
      createdAt: l.createdAt.toISOString(),
    }));
  }
}
