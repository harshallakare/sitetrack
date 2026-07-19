import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import {
  addOrganizationUserSchema,
  createOrganizationSchema,
  createPlatformAdminSchema,
  resetUserPasswordSchema,
  setOrganizationActiveSchema,
  setOrganizationPlanSchema,
  updatePlanSchema,
  updateUserSchema,
  type AddOrganizationUserInput,
  type CreateOrganizationInput,
  type CreatePlatformAdminInput,
  type ResetUserPasswordInput,
  type SetOrganizationActiveInput,
  type SetOrganizationPlanInput,
  type UpdatePlanInput,
  type UpdateUserInput,
} from "@sitetrack/shared-types";
import { Public } from "../common/decorators/public.decorator";
import { AdminJwtAuthGuard } from "../common/guards/admin-jwt-auth.guard";
import { PlatformAdminGuard } from "../common/guards/platform-admin.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { PlatformAdminService } from "./platform-admin.service";
import { PlansService } from "../billing/plans.service";

// @Public() skips the tenant JwtAuthGuard/TenantContextGuard chain (global
// guards applied to every controller by default) -- these routes must not
// require, or even look at, a tenant session. AdminJwtAuthGuard verifies a
// completely separate admin-domain token instead, then PlatformAdminGuard
// re-checks isPlatformAdmin fresh from the DB.
@Public()
@UseGuards(AdminJwtAuthGuard, PlatformAdminGuard)
@Controller("admin")
export class PlatformAdminController {
  constructor(
    private readonly platformAdminService: PlatformAdminService,
    private readonly plansService: PlansService
  ) {}

  @Get("stats")
  getStats() {
    return this.platformAdminService.getStats();
  }

  @Get("plans")
  listPlans() {
    return this.plansService.listPlans();
  }

  @Patch("plans/:slug")
  updatePlan(@Param("slug") slug: string, @Body(new ZodValidationPipe(updatePlanSchema)) dto: UpdatePlanInput) {
    return this.plansService.updatePlan(slug, dto);
  }

  @Put("organizations/:id/plan")
  setOrganizationPlan(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(setOrganizationPlanSchema)) dto: SetOrganizationPlanInput
  ) {
    return this.plansService.setOrganizationPlan(id, dto.planSlug);
  }

  @Get("organizations")
  listOrganizations() {
    return this.platformAdminService.listOrganizations();
  }

  @Post("organizations")
  createOrganization(@Body(new ZodValidationPipe(createOrganizationSchema)) dto: CreateOrganizationInput) {
    return this.platformAdminService.createOrganization(dto);
  }

  @Get("organizations/:id")
  getOrganization(@Param("id") id: string) {
    return this.platformAdminService.getOrganization(id);
  }

  @Post("organizations/:id/users")
  addOrganizationUser(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(addOrganizationUserSchema)) dto: AddOrganizationUserInput
  ) {
    return this.platformAdminService.addOrganizationUser(id, dto);
  }

  @Patch("organizations/:id")
  setOrganizationActive(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(setOrganizationActiveSchema)) dto: SetOrganizationActiveInput
  ) {
    return this.platformAdminService.setOrganizationActive(id, dto.isActive);
  }

  @Get("users")
  listUsers() {
    return this.platformAdminService.listUsers();
  }

  @Post("admins")
  createAdmin(@Body(new ZodValidationPipe(createPlatformAdminSchema)) dto: CreatePlatformAdminInput) {
    return this.platformAdminService.createAdmin(dto);
  }

  @Patch("users/:id")
  updateUser(@Param("id") id: string, @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserInput) {
    return this.platformAdminService.updateUser(id, dto);
  }

  @Post("users/:id/reset-password")
  resetUserPassword(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(resetUserPasswordSchema)) dto: ResetUserPasswordInput
  ) {
    return this.platformAdminService.resetUserPassword(id, dto);
  }
}
