/**
 * Every model in this set has a flat `organizationId` column (see plan doc
 * and schema.template.prisma header). PrismaService's query extension
 * auto-scopes reads/writes for exactly these models. `Organization` itself
 * is the tenant (no organizationId field on it) and `User` is a global
 * identity shared across tenants via Membership -- neither belongs here.
 */
export const TENANT_SCOPED_MODELS = new Set<string>([
  "Membership",
  "RefreshToken",
  "Site",
  "Tag",
  "Vendor",
  "VendorTag",
  "Item",
  "ItemTag",
  "Delivery",
  "DeliveryLineItem",
  "Attachment",
  "Account",
  "Payment",
  "AuditLog",
]);

/**
 * Prisma client property names are camelCase with a lowercase first letter
 * (e.g. model `DeliveryLineItem` -> client.deliveryLineItem).
 */
export function toClientPropertyName(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

/**
 * Operations where Prisma allows an arbitrary `where` filter, so the
 * extension can safely merge `organizationId` directly into args.where.
 */
export const FILTERABLE_WHERE_OPERATIONS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

/**
 * Operations whose `where` must uniquely identify one row (Prisma only
 * allows @id/@unique fields there) -- organizationId can't be merged into
 * `where` for these. The extension instead verifies row ownership via a
 * separate findFirst before letting the operation proceed.
 */
export const SINGLE_ROW_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "update",
  "delete",
]);

export const CREATE_OPERATIONS = new Set(["create"]);
export const CREATE_MANY_OPERATIONS = new Set(["createMany"]);
export const UPSERT_OPERATIONS = new Set(["upsert"]);
