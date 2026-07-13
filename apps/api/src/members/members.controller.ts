import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  acceptInvitationSchema,
  changeMemberRoleSchema,
  inviteMemberSchema,
  type AcceptInvitationInput,
  type ChangeMemberRoleInput,
  type InviteMemberInput,
} from "@sitetrack/shared-types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { TenantContext } from "../auth/types";
import { MembersService } from "./members.service";

@Controller("members")
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  list(@CurrentUser() currentUser: TenantContext) {
    return this.membersService.listMembers(currentUser);
  }

  @Get("invitations")
  listInvitations(@CurrentUser() currentUser: TenantContext) {
    return this.membersService.listInvitations(currentUser);
  }

  @Roles("OWNER")
  @Post("invitations")
  invite(
    @CurrentUser() currentUser: TenantContext,
    @Body(new ZodValidationPipe(inviteMemberSchema)) dto: InviteMemberInput
  ) {
    return this.membersService.invite(currentUser, dto.email, dto.role);
  }

  @Roles("OWNER")
  @Delete("invitations/:id")
  revokeInvitation(@CurrentUser() currentUser: TenantContext, @Param("id") id: string) {
    return this.membersService.revokeInvitation(currentUser, id);
  }

  @Roles("OWNER")
  @Patch(":id/role")
  changeRole(
    @CurrentUser() currentUser: TenantContext,
    @Param("id") membershipId: string,
    @Body(new ZodValidationPipe(changeMemberRoleSchema)) dto: ChangeMemberRoleInput
  ) {
    return this.membersService.changeRole(currentUser, membershipId, dto.role);
  }

  @Roles("OWNER")
  @Delete(":id")
  removeMember(@CurrentUser() currentUser: TenantContext, @Param("id") membershipId: string) {
    return this.membersService.removeMember(currentUser, membershipId);
  }

  // ---- public accept flow (no tenant session required) ----

  @Public()
  @Get("invitations/lookup")
  lookup(@Query("token") token: string) {
    return this.membersService.getInvitationByToken(token);
  }

  @Public()
  @Post("invitations/accept")
  accept(@Body(new ZodValidationPipe(acceptInvitationSchema)) dto: AcceptInvitationInput) {
    return this.membersService.accept(dto);
  }
}
