import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import {
  activatePaymentGatewaySchema,
  paymentProviderSchema,
  upsertPaymentGatewaySchema,
  type ActivatePaymentGatewayInput,
  type UpsertPaymentGatewayInput,
} from "@sitetrack/shared-types";
import { Public } from "../common/decorators/public.decorator";
import { AdminJwtAuthGuard } from "../common/guards/admin-jwt-auth.guard";
import { PlatformAdminGuard } from "../common/guards/platform-admin.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { PaymentGatewaysService } from "./payment-gateways.service";

@Public()
@UseGuards(AdminJwtAuthGuard, PlatformAdminGuard)
@Controller("admin/payment-gateways")
export class PaymentGatewaysController {
  constructor(private readonly service: PaymentGatewaysService) {}

  @Get("registry")
  registry() {
    return this.service.registry();
  }

  @Get()
  list() {
    return this.service.list();
  }

  @Put()
  upsert(@Body(new ZodValidationPipe(upsertPaymentGatewaySchema)) dto: UpsertPaymentGatewayInput) {
    return this.service.upsert(dto);
  }

  @Post(":provider/active")
  setActive(
    @Param("provider") provider: string,
    @Body(new ZodValidationPipe(activatePaymentGatewaySchema)) dto: ActivatePaymentGatewayInput
  ) {
    return this.service.setActive(paymentProviderSchema.parse(provider), dto.isActive);
  }
}
