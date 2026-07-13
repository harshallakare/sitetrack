import { Body, Controller, Delete, Get, Param, Put } from "@nestjs/common";
import { upsertBudgetLineSchema, type UpsertBudgetLineInput } from "@sitetrack/shared-types";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { BudgetService } from "./budget.service";

// Nested under sites: /sites/:siteId/budget
@Controller("sites/:siteId/budget")
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Get()
  get(@Param("siteId") siteId: string) {
    return this.budgetService.siteBudget(siteId);
  }

  @Roles("OWNER", "SUPERVISOR")
  @Put()
  upsert(
    @Param("siteId") siteId: string,
    @Body(new ZodValidationPipe(upsertBudgetLineSchema)) dto: UpsertBudgetLineInput
  ) {
    return this.budgetService.upsertBudgetLine(siteId, dto.category, dto.plannedAmount);
  }

  @Roles("OWNER", "SUPERVISOR")
  @Delete(":lineId")
  remove(@Param("lineId") lineId: string) {
    return this.budgetService.deleteBudgetLine(lineId);
  }
}
