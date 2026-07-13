import { Module } from "@nestjs/common";
import { TagsModule } from "../tags/tags.module";
import { VendorsController } from "./vendors.controller";
import { VendorsService } from "./vendors.service";
import { LedgerService } from "./ledger.service";

@Module({
  imports: [TagsModule],
  controllers: [VendorsController],
  providers: [VendorsService, LedgerService],
})
export class VendorsModule {}
