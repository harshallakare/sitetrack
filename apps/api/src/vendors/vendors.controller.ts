import { Body, Controller, Get, NotFoundException, Param, Patch, Post } from "@nestjs/common";
import {
  createVendorSchema,
  updateVendorSchema,
  type CreateVendorInput,
  type UpdateVendorInput,
} from "@sitetrack/shared-types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { TenantContext } from "../auth/types";
import { VendorsService } from "./vendors.service";
import { LedgerService } from "./ledger.service";

@Controller("vendors")
export class VendorsController {
  constructor(
    private readonly vendorsService: VendorsService,
    private readonly ledgerService: LedgerService
  ) {}

  @Get()
  list() {
    return this.vendorsService.list();
  }

  // Static routes must precede the ":id" param route so they aren't shadowed.
  @Get("payables")
  payables() {
    return this.ledgerService.payables();
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const vendor = await this.vendorsService.get(id);
    if (!vendor) throw new NotFoundException("Vendor not found");
    return vendor;
  }

  @Get(":id/ledger")
  ledger(@Param("id") id: string) {
    return this.ledgerService.vendorLedger(id);
  }

  @Roles("OWNER", "SUPERVISOR")
  @Post()
  create(
    @CurrentUser() currentUser: TenantContext,
    @Body(new ZodValidationPipe(createVendorSchema)) dto: CreateVendorInput
  ) {
    return this.vendorsService.create(dto, currentUser.userId);
  }

  @Roles("OWNER", "SUPERVISOR")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @CurrentUser() currentUser: TenantContext,
    @Body(new ZodValidationPipe(updateVendorSchema)) dto: UpdateVendorInput
  ) {
    return this.vendorsService.update(id, dto, currentUser.userId);
  }
}
