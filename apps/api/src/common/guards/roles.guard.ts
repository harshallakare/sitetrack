import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "@sitetrack/shared-types";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { TenantContext } from "../../auth/types";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const tenantContext = request.tenantContext as TenantContext | undefined;
    return !!tenantContext && requiredRoles.includes(tenantContext.role);
  }
}
