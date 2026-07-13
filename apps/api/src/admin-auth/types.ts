/**
 * Deliberately minimal: no organizationId, no role. Admin routes always use
 * prisma.unscoped and re-verify isPlatformAdmin fresh from the DB on every
 * request (see PlatformAdminGuard) rather than trusting a token claim, so
 * the token itself only needs to identify the user.
 */
export interface AdminTokenPayload {
  sub: string; // userId
}
