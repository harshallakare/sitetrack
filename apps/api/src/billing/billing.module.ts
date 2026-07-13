import { Global, Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { PlansService } from "./plans.service";

// Global so SitesService can inject PlansService for the create-site limit.
@Global()
@Module({
  controllers: [BillingController],
  providers: [PlansService],
  exports: [PlansService],
})
export class BillingModule {}
