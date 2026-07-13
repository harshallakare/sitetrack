import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { AdminTokenPayload } from "../../admin-auth/types";

/**
 * Cross-tenant by design: checks a flag on the User record directly
 * (via the unscoped client), independent of any organization membership.
 * Runs after AdminJwtAuthGuard, which verifies an admin-domain token (a
 * completely separate credential from the tenant access token -- see
 * AdminJwtStrategy). This guard re-checks isPlatformAdmin fresh from the DB
 * rather than trusting the token, so revoking the flag takes effect on the
 * very next request.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const payload = request.user as AdminTokenPayload | undefined;
    if (!payload?.sub) {
      throw new UnauthorizedException("Missing authentication context");
    }

    const user = await this.prisma.unscoped.user.findUnique({
      where: { id: payload.sub },
      select: { isPlatformAdmin: true },
    });

    if (!user?.isPlatformAdmin) {
      throw new ForbiddenException("Platform admin access required");
    }

    return true;
  }
}
