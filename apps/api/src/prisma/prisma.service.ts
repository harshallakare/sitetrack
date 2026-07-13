import { Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@sitetrack/database";
import { ClsService } from "nestjs-cls";
import type { AppClsStore } from "../common/cls/app-cls-store";
import {
  CREATE_MANY_OPERATIONS,
  CREATE_OPERATIONS,
  FILTERABLE_WHERE_OPERATIONS,
  SINGLE_ROW_OPERATIONS,
  TENANT_SCOPED_MODELS,
  UPSERT_OPERATIONS,
  toClientPropertyName,
} from "./tenant-scoped-models";

/**
 * IMPORTANT (Prisma extensions gotcha #1): $allOperations only intercepts
 * top-level operations issued directly by application code (e.g.
 * `prisma.db.vendor.create(...)`). Nested writes performed as part of a
 * parent's `data` (e.g. `vendor.create({ data: { tags: { create: [...] } } } })`)
 * are NOT intercepted, so organizationId would never be injected into a
 * nested VendorTag/ItemTag/DeliveryLineItem/Attachment row. Every service in
 * this codebase must therefore avoid nested relation writes for
 * tenant-scoped child models and instead perform them as separate top-level
 * calls (e.g. `tag.create`, `deliveryLineItem.createMany`), grouped in a
 * `prisma.db.$transaction(...)` for atomicity where needed. Extensions do
 * carry over into `$transaction`'s callback client, so scoping still applies
 * inside a transaction.
 *
 * IMPORTANT (gotcha #2, found by actually running this against SQLite):
 * this extension originally wrote AuditLog rows as an automatic side effect
 * of every create/update/delete, using the closed-over top-level `unscoped`
 * client. That client is a DIFFERENT connection than any active
 * `$transaction`'s `tx` -- so a mutation performed inside a transaction
 * (e.g. Deliveries' create, which wraps Delivery + DeliveryLineItem writes)
 * triggered a second, non-transactional write attempt on a separate
 * connection while the transaction's connection still held SQLite's
 * single-writer lock, deadlocking until the transaction timed out. It's
 * also simply incorrect regardless of engine: an audit row written outside
 * the transaction wouldn't roll back if the transaction did. Audit logging
 * is therefore NOT automatic here -- services write their own AuditLog rows
 * explicitly via `prisma.db.auditLog.create(...)` (or `tx.auditLog.create`
 * from inside their own transaction), which correctly participates in
 * whatever transaction it's called from, since `auditLog.create` still goes
 * through this same extension's CREATE_OPERATIONS branch for organizationId
 * injection.
 */

function requireOrganizationId(cls: ClsService<AppClsStore>, model: string): string {
  const organizationId = cls.get("organizationId");
  if (!organizationId) {
    throw new Error(
      `Tenant context missing for scoped query on model "${model}". ` +
        "TenantContextGuard must run before any tenant-scoped Prisma query is issued."
    );
  }
  return organizationId;
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  /** Raw, unscoped client. Only for legitimate cross-tenant needs (e.g. auth
   * looking up a user's memberships across all orgs before one is selected).
   * Named distinctly so any use of it is easy to grep for and review. */
  public readonly unscoped: PrismaClient;

  /** Tenant-scoped client. Every feature module must use this one. */
  public readonly db: PrismaClient;

  /**
   * The extension injects organizationId into `data` at runtime regardless
   * of what's passed, but Prisma's generated *CreateInput types still
   * require the field statically (they have no idea an extension exists).
   * Feature services read it from here to satisfy the compiler; the
   * extension remains the actual enforcement point if the two ever
   * disagree, since it always overwrites whatever value is supplied.
   */
  get organizationId(): string {
    return requireOrganizationId(this.cls, "(explicit access)");
  }

  constructor(private readonly cls: ClsService<AppClsStore>) {
    this.unscoped = new PrismaClient();
    this.db = this.buildScopedClient();
  }

  async onModuleInit() {
    await this.unscoped.$connect();
  }

  async onModuleDestroy() {
    await this.unscoped.$disconnect();
  }

  private buildScopedClient() {
    const cls = this.cls;
    const rawClient = this.unscoped;

    return this.unscoped.$extends({
      name: "tenant-scoping",
      query: {
        $allModels: {
          $allOperations: async ({ model, operation, args, query }) => {
            if (!model || !TENANT_SCOPED_MODELS.has(model)) {
              return query(args);
            }

            const organizationId = requireOrganizationId(cls, model);
            const anyArgs = args as Record<string, any>;
            const delegate = (rawClient as Record<string, any>)[toClientPropertyName(model)];

            if (FILTERABLE_WHERE_OPERATIONS.has(operation)) {
              anyArgs.where = { ...(anyArgs.where ?? {}), organizationId };
              if (operation === "updateMany" && anyArgs.data) {
                anyArgs.data = { ...anyArgs.data, organizationId };
              }
              return query(anyArgs);
            }

            if (CREATE_OPERATIONS.has(operation)) {
              anyArgs.data = { ...(anyArgs.data ?? {}), organizationId };
              return query(anyArgs);
            }

            if (CREATE_MANY_OPERATIONS.has(operation)) {
              const data = Array.isArray(anyArgs.data) ? anyArgs.data : [anyArgs.data];
              anyArgs.data = data.map((row: Record<string, any>) => ({ ...row, organizationId }));
              return query(anyArgs);
            }

            if (UPSERT_OPERATIONS.has(operation)) {
              const existing = await delegate.findFirst({ where: anyArgs.where });
              if (existing && existing.organizationId !== organizationId) {
                throw new NotFoundException(`${model} not found`);
              }
              anyArgs.create = { ...(anyArgs.create ?? {}), organizationId };
              anyArgs.update = { ...(anyArgs.update ?? {}), organizationId };
              return query(anyArgs);
            }

            if (SINGLE_ROW_OPERATIONS.has(operation)) {
              const id = anyArgs?.where?.id;
              if (!id) {
                throw new Error(
                  `Tenant-scoped "${operation}" on ${model} requires where.id (compound unique lookups aren't supported by the isolation layer yet).`
                );
              }
              const existing = await delegate.findFirst({ where: { id, organizationId } });
              if (!existing) {
                if (operation === "findUnique") return null;
                throw new NotFoundException(`${model} not found`);
              }
              if (operation === "update" && anyArgs.data) {
                anyArgs.data = { ...anyArgs.data, organizationId };
              }
              return query(anyArgs);
            }

            // Any operation not explicitly categorized (e.g. raw aggregate
            // variants added by future Prisma versions) fails closed rather
            // than silently running unscoped.
            throw new Error(
              `Tenant-scoping extension has no handling for operation "${operation}" on model "${model}". ` +
                "Add it to tenant-scoped-models.ts explicitly before using it."
            );
          },
        },
      },
    }) as unknown as PrismaClient;
  }
}
