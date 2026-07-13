import type { Role } from "@sitetrack/shared-types";

export interface AccessTokenPayload {
  sub: string; // userId
  organizationId: string;
  role: Role;
  membershipId: string;
}

export interface TenantContext {
  userId: string;
  organizationId: string;
  role: Role;
  membershipId: string;
}
