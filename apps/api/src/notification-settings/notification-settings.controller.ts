import { Body, Controller, Get, Post, Put, UseGuards } from "@nestjs/common";
import {
  sendTestNotificationSchema,
  updateNotificationSettingsSchema,
  type SendTestNotificationInput,
  type UpdateNotificationSettingsInput,
} from "@sitetrack/shared-types";
import { Public } from "../common/decorators/public.decorator";
import { AdminJwtAuthGuard } from "../common/guards/admin-jwt-auth.guard";
import { PlatformAdminGuard } from "../common/guards/platform-admin.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { NotificationDispatchService } from "../notifications/notification-dispatch.service";
import { NotificationSettingsService } from "./notification-settings.service";

// Platform-admin domain (separate token), never the tenant chain -- see
// PlatformAdminController for the same @Public() + admin-guard pattern.
@Public()
@UseGuards(AdminJwtAuthGuard, PlatformAdminGuard)
@Controller("admin/notification-settings")
export class NotificationSettingsController {
  constructor(
    private readonly service: NotificationSettingsService,
    private readonly dispatch: NotificationDispatchService
  ) {}

  @Get()
  get() {
    return this.service.get();
  }

  @Put()
  update(@Body(new ZodValidationPipe(updateNotificationSettingsSchema)) dto: UpdateNotificationSettingsInput) {
    return this.service.update(dto);
  }

  @Post("test")
  sendTest(@Body(new ZodValidationPipe(sendTestNotificationSchema)) dto: SendTestNotificationInput) {
    return this.dispatch.dispatch({
      recipient: dto.recipient,
      template: { name: "test", data: { message: "This is a test notification from SiteTrack." } },
    });
  }
}
