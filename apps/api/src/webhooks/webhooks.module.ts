import { Module } from "@nestjs/common";
import { WebhooksController } from "./webhooks.controller";

// PlansService/RazorpayService come from BillingModule, which is @Global()
// (registered once in AppModule) -- no import needed here to inject them.
@Module({
  controllers: [WebhooksController],
})
export class WebhooksModule {}
