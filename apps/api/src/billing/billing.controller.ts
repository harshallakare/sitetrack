import { Body, Controller, Get, Post } from "@nestjs/common";
import { verifyCheckoutSchema, type VerifyCheckoutInput } from "@sitetrack/shared-types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { TenantContext } from "../auth/types";
import { PlansService } from "./plans.service";

// Customer-facing: the org's own plan, usage, and self-serve checkout.
@Controller("billing")
export class BillingController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  summary(@CurrentUser() currentUser: TenantContext) {
    return this.plansService.billingSummary(currentUser.organizationId);
  }

  // OWNER only -- billing is an ownership-level decision, same bar as invites.
  @Roles("OWNER")
  @Post("checkout")
  startCheckout(@CurrentUser() currentUser: TenantContext) {
    return this.plansService.createCheckoutSubscription(currentUser.organizationId);
  }

  @Roles("OWNER")
  @Post("checkout/verify")
  verifyCheckout(
    @CurrentUser() currentUser: TenantContext,
    @Body(new ZodValidationPipe(verifyCheckoutSchema)) dto: VerifyCheckoutInput
  ) {
    return this.plansService.verifyCheckoutPayment(currentUser.organizationId, currentUser.userId, dto);
  }

  @Roles("OWNER")
  @Post("cancel")
  cancel(@CurrentUser() currentUser: TenantContext) {
    return this.plansService.cancelSubscription(currentUser.organizationId, currentUser.userId);
  }

  @Get("history")
  history(@CurrentUser() currentUser: TenantContext) {
    return this.plansService.billingHistory(currentUser.organizationId);
  }
}
