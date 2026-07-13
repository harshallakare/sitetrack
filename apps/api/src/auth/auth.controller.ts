import { Body, Controller, Get, Patch, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  switchOrganizationSchema,
  updatePreferencesSchema,
  type LoginInput,
  type RefreshTokenInput,
  type RegisterInput,
  type RequestPasswordResetInput,
  type ResetPasswordInput,
  type SwitchOrganizationInput,
  type UpdatePreferencesInput,
} from "@sitetrack/shared-types";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AuthService } from "./auth.service";
import type { TenantContext } from "./types";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("register")
  register(@Body(new ZodValidationPipe(registerSchema)) dto: RegisterInput) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login")
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginInput) {
    return this.authService.login(dto);
  }

  @Public()
  @Post("refresh")
  refresh(@Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenInput) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post("request-password-reset")
  async requestPasswordReset(
    @Body(new ZodValidationPipe(requestPasswordResetSchema)) dto: RequestPasswordResetInput
  ) {
    await this.authService.requestPasswordReset(dto.email);
    // Always success -- never reveal whether the email has an account.
    return { success: true };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("reset-password")
  async resetPassword(@Body(new ZodValidationPipe(resetPasswordSchema)) dto: ResetPasswordInput) {
    await this.authService.resetPassword(dto.token, dto.password);
    return { success: true };
  }

  @Get("me")
  me(@CurrentUser() currentUser: TenantContext) {
    return this.authService.getCurrentUser(currentUser.userId);
  }

  @Patch("preferences")
  updatePreferences(
    @CurrentUser() currentUser: TenantContext,
    @Body(new ZodValidationPipe(updatePreferencesSchema)) dto: UpdatePreferencesInput
  ) {
    return this.authService.updatePreferences(currentUser.userId, dto);
  }

  @Post("switch-organization")
  switchOrganization(
    @CurrentUser() currentUser: TenantContext,
    @Body(new ZodValidationPipe(switchOrganizationSchema)) dto: SwitchOrganizationInput
  ) {
    return this.authService.switchOrganization(currentUser.userId, dto.organizationId);
  }

  @Post("logout")
  async logout(@Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenInput) {
    await this.authService.logout(dto.refreshToken);
    return { success: true };
  }
}
