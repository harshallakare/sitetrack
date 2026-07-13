import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { TenantContext } from "../../auth/types";

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): TenantContext => {
  const request = ctx.switchToHttp().getRequest();
  return request.tenantContext;
});
