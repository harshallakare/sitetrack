import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post } from "@nestjs/common";
import {
  createServiceSchema,
  updateServiceSchema,
  type CreateServiceInput,
  type UpdateServiceInput,
} from "@sitetrack/shared-types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { TenantContext } from "../auth/types";
import { ServicesService } from "./services.service";

@Controller("services")
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  list() {
    return this.servicesService.list();
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const service = await this.servicesService.get(id);
    if (!service) throw new NotFoundException("Service not found");
    return service;
  }

  @Roles("OWNER", "SUPERVISOR")
  @Post()
  create(
    @CurrentUser() currentUser: TenantContext,
    @Body(new ZodValidationPipe(createServiceSchema)) dto: CreateServiceInput
  ) {
    return this.servicesService.create(dto, currentUser.userId);
  }

  @Roles("OWNER", "SUPERVISOR")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @CurrentUser() currentUser: TenantContext,
    @Body(new ZodValidationPipe(updateServiceSchema)) dto: UpdateServiceInput
  ) {
    return this.servicesService.update(id, dto, currentUser.userId);
  }

  @Roles("OWNER", "SUPERVISOR")
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() currentUser: TenantContext) {
    return this.servicesService.remove(id, currentUser.userId);
  }
}
