import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Marks a route as exempt from JwtAuthGuard/TenantContextGuard (e.g. login, register). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
