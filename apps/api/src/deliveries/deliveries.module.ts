import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { DeliveriesController } from "./deliveries.controller";
import { DeliveriesService } from "./deliveries.service";

@Module({
  imports: [StorageModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
})
export class DeliveriesModule {}
