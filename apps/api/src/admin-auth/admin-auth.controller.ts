import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { loginSchema, refreshTokenSchema, type LoginInput, type RefreshTokenInput } from "@sitetrack/shared-types";
import { Public } from "../common/decorators/public.decorator";
import { AdminJwtAuthGuard } from "../common/guards/admin-jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AdminAuthService } from "./admin-auth.service";
import type { AdminTokenPayload } from "./types";

function requestMeta(req: Request) {
  return { userAgent: req.headers["user-agent"], ip: req.ip };
}

// @Public() at the controller level so NONE of these routes ever go through
// the tenant JwtAuthGuard/TenantContextGuard chain (those are global guards
// applied via APP_GUARD to every controller by default). An admin token
// would fail tenant JwtAuthGuard's signature check anyway (different
// secret), but without @Public() a request would be rejected by that guard
// before AdminJwtAuthGuard on "me" ever ran -- this controller's auth is
// entirely self-contained.
@Public()
@Controller("admin-auth")
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginInput, @Req() req: Request) {
    return this.adminAuthService.login(dto.email, dto.password, requestMeta(req));
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("refresh")
  refresh(@Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenInput, @Req() req: Request) {
    return this.adminAuthService.refresh(dto.refreshToken, requestMeta(req));
  }

  @Post("logout")
  async logout(@Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenInput) {
    await this.adminAuthService.logout(dto.refreshToken);
    return { success: true };
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get("me")
  me(@Req() req: Request) {
    const payload = req.user as AdminTokenPayload;
    return this.adminAuthService.getCurrentAdmin(payload.sub);
  }
}
