import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Query } from "@nestjs/common";
import { createPaymentSchema, type CreatePaymentInput } from "@sitetrack/shared-types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { TenantContext } from "../auth/types";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  list(
    @Query("siteId") siteId?: string,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("skip") skip?: string
  ) {
    return this.paymentsService.list({
      siteId,
      search,
      limit: limit ? Number(limit) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const payment = await this.paymentsService.get(id);
    if (!payment) throw new NotFoundException("Payment not found");
    return payment;
  }

  @Roles("OWNER", "ACCOUNTANT")
  @Post()
  create(
    @CurrentUser() currentUser: TenantContext,
    @Body(new ZodValidationPipe(createPaymentSchema)) dto: CreatePaymentInput
  ) {
    return this.paymentsService.create(dto, currentUser.userId);
  }

  @Roles("OWNER", "ACCOUNTANT")
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() currentUser: TenantContext) {
    return this.paymentsService.remove(id, currentUser.userId);
  }
}
