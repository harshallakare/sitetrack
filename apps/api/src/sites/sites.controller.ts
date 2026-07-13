import { Body, Controller, Get, NotFoundException, Param, Patch, Post } from "@nestjs/common";
import {
  createSiteSchema,
  updateSiteSchema,
  type CreateSiteInput,
  type UpdateSiteInput,
} from "@sitetrack/shared-types";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { SitesService } from "./sites.service";

@Controller("sites")
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  list() {
    return this.sitesService.list();
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const site = await this.sitesService.get(id);
    if (!site) throw new NotFoundException("Site not found");
    return site;
  }

  @Roles("OWNER", "SUPERVISOR")
  @Post()
  create(@Body(new ZodValidationPipe(createSiteSchema)) dto: CreateSiteInput) {
    return this.sitesService.create(dto);
  }

  @Roles("OWNER", "SUPERVISOR")
  @Patch(":id")
  update(@Param("id") id: string, @Body(new ZodValidationPipe(updateSiteSchema)) dto: UpdateSiteInput) {
    return this.sitesService.update(id, dto);
  }
}
