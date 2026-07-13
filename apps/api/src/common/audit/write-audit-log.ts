/**
 * Structural subset of PrismaClient, not the full type -- the `tx` object
 * Prisma hands to a `$transaction(async (tx) => ...)` callback is typed as
 * PrismaClient minus a few top-level methods ($connect/$transaction/etc.),
 * which doesn't structurally satisfy `PrismaClient` itself. Both `prisma.db`
 * and `tx` do satisfy this narrower shape.
 */
interface AuditableClient {
  auditLog: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
}

/**
 * Explicit audit-trail helper (see prisma.service.ts header comment for why
 * this isn't automatic). Pass `prisma.db` for a standalone write, or the
 * `tx` client from inside a `prisma.db.$transaction(...)` callback so the
 * audit row commits/rolls back atomically with the rest of the operation.
 * `client.auditLog.create` still goes through the tenant-scoping extension,
 * so organizationId is injected the same way as any other write.
 */
export async function writeAuditLog(
  client: AuditableClient,
  params: {
    organizationId: string;
    entityType: string;
    entityId: string;
    action: "CREATE" | "UPDATE" | "DELETE";
    actorUserId: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
  }
) {
  await client.auditLog.create({
    data: {
      organizationId: params.organizationId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      actorUserId: params.actorUserId,
      beforeJson: params.before ? JSON.stringify(params.before) : null,
      afterJson: params.after ? JSON.stringify(params.after) : null,
    },
  });
}
