import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createVendorReturnSchema,
  updateVendorReturnSchema,
  type CreateVendorReturnInput,
  type UpdateVendorReturnInput,
} from "@sitetrack/shared-types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { TenantContext } from "../auth/types";
import { VendorReturnsService } from "./vendor-returns.service";

@Controller("vendor-returns")
export class VendorReturnsController {
  constructor(private readonly vendorReturnsService: VendorReturnsService) {}

  @Get()
  list(@Query("siteId") siteId?: string, @Query("vendorId") vendorId?: string) {
    return this.vendorReturnsService.list({ siteId, vendorId });
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const vendorReturn = await this.vendorReturnsService.get(id);
    if (!vendorReturn) throw new NotFoundException("Vendor return not found");
    return vendorReturn;
  }

  @Roles("OWNER", "SUPERVISOR")
  @Post()
  create(
    @CurrentUser() currentUser: TenantContext,
    @Body(new ZodValidationPipe(createVendorReturnSchema)) dto: CreateVendorReturnInput
  ) {
    return this.vendorReturnsService.create(dto, currentUser.userId);
  }

  @Roles("OWNER", "SUPERVISOR")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @CurrentUser() currentUser: TenantContext,
    @Body(new ZodValidationPipe(updateVendorReturnSchema)) dto: UpdateVendorReturnInput
  ) {
    return this.vendorReturnsService.update(id, dto, currentUser.userId);
  }

  @Roles("OWNER", "SUPERVISOR")
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() currentUser: TenantContext) {
    return this.vendorReturnsService.remove(id, currentUser.userId);
  }
}
