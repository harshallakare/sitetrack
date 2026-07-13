import { Body, Controller, Get, NotFoundException, Param, Patch, Post } from "@nestjs/common";
import {
  createAccountSchema,
  updateAccountSchema,
  type CreateAccountInput,
  type UpdateAccountInput,
} from "@sitetrack/shared-types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { TenantContext } from "../auth/types";
import { AccountsService } from "./accounts.service";

@Controller("accounts")
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  list() {
    return this.accountsService.list();
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const account = await this.accountsService.get(id);
    if (!account) throw new NotFoundException("Account not found");
    return account;
  }

  @Roles("OWNER", "ACCOUNTANT")
  @Post()
  create(
    @CurrentUser() currentUser: TenantContext,
    @Body(new ZodValidationPipe(createAccountSchema)) dto: CreateAccountInput
  ) {
    return this.accountsService.create(dto, currentUser.userId);
  }

  @Roles("OWNER", "ACCOUNTANT")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @CurrentUser() currentUser: TenantContext,
    @Body(new ZodValidationPipe(updateAccountSchema)) dto: UpdateAccountInput
  ) {
    return this.accountsService.update(id, dto, currentUser.userId);
  }
}
