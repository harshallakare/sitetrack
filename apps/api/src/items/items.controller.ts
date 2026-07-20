import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post } from "@nestjs/common";
import {
  createItemSchema,
  updateItemSchema,
  type CreateItemInput,
  type UpdateItemInput,
} from "@sitetrack/shared-types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { TenantContext } from "../auth/types";
import { ItemsService } from "./items.service";

@Controller("items")
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  list() {
    return this.itemsService.list();
  }

  // Declared BEFORE ":id" so the literal path wins route matching.
  @Get("stats")
  getAllDeliveryStats() {
    return this.itemsService.getAllDeliveryStats();
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const item = await this.itemsService.get(id);
    if (!item) throw new NotFoundException("Item not found");
    return item;
  }

  @Get(":id/delivery-stats")
  getDeliveryStats(@Param("id") id: string) {
    return this.itemsService.getDeliveryStats(id);
  }

  @Get(":id/detail")
  async getDetail(@Param("id") id: string) {
    const detail = await this.itemsService.getDetail(id);
    if (!detail) throw new NotFoundException("Item not found");
    return detail;
  }

  @Roles("OWNER", "SUPERVISOR")
  @Post()
  create(
    @CurrentUser() currentUser: TenantContext,
    @Body(new ZodValidationPipe(createItemSchema)) dto: CreateItemInput
  ) {
    return this.itemsService.create(dto, currentUser.userId);
  }

  @Roles("OWNER", "SUPERVISOR")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @CurrentUser() currentUser: TenantContext,
    @Body(new ZodValidationPipe(updateItemSchema)) dto: UpdateItemInput
  ) {
    return this.itemsService.update(id, dto, currentUser.userId);
  }

  @Roles("OWNER", "SUPERVISOR")
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() currentUser: TenantContext) {
    return this.itemsService.remove(id, currentUser.userId);
  }
}
