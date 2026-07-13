import { Controller, Get } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { TenantContext } from "../auth/types";
import { PlansService } from "./plans.service";

// Customer-facing: the org's own plan, usage, and upgrade options.
@Controller("billing")
export class BillingController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  summary(@CurrentUser() currentUser: TenantContext) {
    return this.plansService.billingSummary(currentUser.organizationId);
  }
}
