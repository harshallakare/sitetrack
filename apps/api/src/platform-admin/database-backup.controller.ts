import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { restoreDatabaseSchema, type RestoreDatabaseInput } from "@sitetrack/shared-types";
import { Public } from "../common/decorators/public.decorator";
import { AdminJwtAuthGuard } from "../common/guards/admin-jwt-auth.guard";
import { PlatformAdminGuard } from "../common/guards/platform-admin.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { DatabaseBackupService } from "./database-backup.service";

// 2GB -- generous enough for any real construction-SaaS deployment's
// database dump; the important limit is the upload actually terminating
// rather than the exact number.
const MAX_BACKUP_BYTES = 2 * 1024 * 1024 * 1024;

@Public()
@UseGuards(AdminJwtAuthGuard, PlatformAdminGuard)
@Controller("admin/database")
export class DatabaseBackupController {
  constructor(private readonly backupService: DatabaseBackupService) {}

  @Get("backup")
  async backup(@Res() res: Response) {
    const { stream, fileName, contentType } = await this.backupService.createBackupStream();
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    stream.pipe(res);
  }

  // The typed "RESTORE" literal is enforced server-side by
  // restoreDatabaseSchema, not just disabled in the UI until typed --
  // a client bug or a direct API call can't skip the confirmation.
  @Post("restore")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_BACKUP_BYTES } }))
  async restore(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body(new ZodValidationPipe(restoreDatabaseSchema)) _dto: RestoreDatabaseInput
  ) {
    if (!file) throw new BadRequestException("No backup file uploaded");
    const { snapshotFileName } = await this.backupService.restoreFromBuffer(file.buffer);
    return {
      restored: true,
      message:
        "Database restored. A safety snapshot of the previous state was saved on the server before the restore ran. Restart the api service to ensure a fully clean connection state.",
      preRestoreSnapshot: snapshotFileName,
    };
  }
}
