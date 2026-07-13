import { Module } from "@nestjs/common";
import { TagsModule } from "../tags/tags.module";
import { ItemsController } from "./items.controller";
import { ItemsService } from "./items.service";

@Module({
  imports: [TagsModule],
  controllers: [ItemsController],
  providers: [ItemsService],
})
export class ItemsModule {}
