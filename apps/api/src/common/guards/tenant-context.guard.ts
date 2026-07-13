import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ClsService } from "nestjs-cls";
import { PrismaService } from "../../prisma/prisma.service";
import type { AccessTokenPayload } from "../../auth/types";
import type { Role } from "@sitetrack/shared-types";
import type { AppClsStore } from "../cls/app-cls-store";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

/**
 * Runs after JwtAuthGuard. Re-reads the user's Membership fresh from the DB
 * (never trusts the JWT's role/organizationId claims as final authority),
 * then populates the CLS context that PrismaService reads to auto-scope
 * every query. Nothing downstream can issue a tenant-scoped Prisma query
 * without this guard having run first and succeeded.
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService<AppClsStore>,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const payload = request.user as AccessTokenPayload | undefined;

    if (!payload?.sub || !payload?.organizationId) {
      throw new UnauthorizedException("Missing authentication context");
    }

    const membership = await this.prisma.unscoped.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: payload.sub,
          organizationId: payload.organizationId,
        },
      },
      include: { organization: true },
    });

    // Checking membership.isActive alone isn't enough: a platform admin
    // suspending an organization (Organization.isActive = false) must also
    // immediately lock out its members, not just individually-deactivated
    // memberships.
    if (!membership || !membership.isActive || !membership.organization.isActive) {
      throw new ForbiddenException("You no longer have access to this organization");
    }

    const role = membership.role as Role;

    this.cls.set("userId", payload.sub);
    this.cls.set("organizationId", payload.organizationId);
    this.cls.set("role", role);
    this.cls.set("membershipId", membership.id);

    request.tenantContext = {
      userId: payload.sub,
      organizationId: payload.organizationId,
      role,
      membershipId: membership.id,
    };

    return true;
  }
}
