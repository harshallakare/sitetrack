import { Module } from "@nestjs/common";
import { PlatformAdminController } from "./platform-admin.controller";
import { PlatformAdminService } from "./platform-admin.service";
import { DatabaseBackupController } from "./database-backup.controller";
import { DatabaseBackupService } from "./database-backup.service";
import { PlatformAdminGuard } from "../common/guards/platform-admin.guard";

@Module({
  controllers: [PlatformAdminController, DatabaseBackupController],
  providers: [PlatformAdminService, DatabaseBackupService, PlatformAdminGuard],
})
export class PlatformAdminModule {}
