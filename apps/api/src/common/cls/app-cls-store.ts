import type { ClsStore } from "nestjs-cls";
import type { Role } from "@sitetrack/shared-types";

/**
 * Populated by TenantContextGuard on every authenticated request.
 * PrismaService reads organizationId from here to auto-scope every query.
 */
export interface AppClsStore extends ClsStore {
  userId?: string;
  organizationId?: string;
  role?: Role;
  membershipId?: string;
}
