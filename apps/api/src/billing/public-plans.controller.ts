import { Controller, Get } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { PlansService } from "./plans.service";

// Fully public, unauthenticated: powers the marketing page's pricing
// section. Separate from BillingController (which is the org's own,
// authenticated billing view) since this has no tenant context at all.
@Public()
@Controller("plans")
export class PublicPlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  list() {
    return this.plansService.listPublicPlans();
  }
}
