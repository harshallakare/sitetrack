import { Body, Controller, Get, Param, Patch, Put, UseGuards } from "@nestjs/common";
import {
  setOrganizationActiveSchema,
  setOrganizationPlanSchema,
  type SetOrganizationActiveInput,
  type SetOrganizationPlanInput,
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

  @Get("organizations/:id")
  getOrganization(@Param("id") id: string) {
    return this.platformAdminService.getOrganization(id);
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
}
