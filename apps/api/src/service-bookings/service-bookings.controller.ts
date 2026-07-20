import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createServiceBookingSchema,
  updateServiceBookingSchema,
  type CreateServiceBookingInput,
  type UpdateServiceBookingInput,
} from "@sitetrack/shared-types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { TenantContext } from "../auth/types";
import { ServiceBookingsService } from "./service-bookings.service";

@Controller("service-bookings")
export class ServiceBookingsController {
  constructor(private readonly serviceBookingsService: ServiceBookingsService) {}

  @Get()
  list(@Query("siteId") siteId?: string) {
    return this.serviceBookingsService.list({ siteId });
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const booking = await this.serviceBookingsService.get(id);
    if (!booking) throw new NotFoundException("Service booking not found");
    return booking;
  }

  @Roles("OWNER", "SUPERVISOR")
  @Post()
  create(
    @CurrentUser() currentUser: TenantContext,
    @Body(new ZodValidationPipe(createServiceBookingSchema)) dto: CreateServiceBookingInput
  ) {
    return this.serviceBookingsService.create(dto, currentUser.userId);
  }

  @Roles("OWNER", "SUPERVISOR")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @CurrentUser() currentUser: TenantContext,
    @Body(new ZodValidationPipe(updateServiceBookingSchema)) dto: UpdateServiceBookingInput
  ) {
    return this.serviceBookingsService.update(id, dto, currentUser.userId);
  }

  @Roles("OWNER", "SUPERVISOR")
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() currentUser: TenantContext) {
    return this.serviceBookingsService.remove(id, currentUser.userId);
  }
}
