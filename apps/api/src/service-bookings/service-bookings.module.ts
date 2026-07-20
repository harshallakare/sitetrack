import { Module } from "@nestjs/common";
import { ServiceBookingsController } from "./service-bookings.controller";
import { ServiceBookingsService } from "./service-bookings.service";

@Module({
  controllers: [ServiceBookingsController],
  providers: [ServiceBookingsService],
})
export class ServiceBookingsModule {}
