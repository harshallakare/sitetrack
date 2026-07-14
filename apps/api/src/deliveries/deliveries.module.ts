import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { BudgetModule } from "../budget/budget.module";
import { DeliveriesController } from "./deliveries.controller";
import { DeliveriesService } from "./deliveries.service";

@Module({
  imports: [StorageModule, BudgetModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
})
export class DeliveriesModule {}
