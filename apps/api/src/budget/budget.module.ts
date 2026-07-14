import { Module } from "@nestjs/common";
import { BudgetController } from "./budget.controller";
import { BudgetService } from "./budget.service";
import { BudgetAlertService } from "./budget-alert.service";

@Module({
  controllers: [BudgetController],
  providers: [BudgetService, BudgetAlertService],
  exports: [BudgetAlertService],
})
export class BudgetModule {}
