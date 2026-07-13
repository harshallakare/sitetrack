import { Controller, Get } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { TenantContext } from "../auth/types";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get("me")
  getCurrent(@CurrentUser() currentUser: TenantContext) {
    return this.organizationsService.getCurrentOrganization(currentUser);
  }

  @Get("mine")
  listMine(@CurrentUser() currentUser: TenantContext) {
    return this.organizationsService.listMyOrganizations(currentUser);
  }

  @Get("members")
  listMembers(@CurrentUser() currentUser: TenantContext) {
    return this.organizationsService.listMembers(currentUser);
  }
}
