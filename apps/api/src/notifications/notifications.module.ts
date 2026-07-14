import { Global, Module } from "@nestjs/common";
import { NotificationDispatchService } from "./notification-dispatch.service";
import { WeeklyDigestService } from "./weekly-digest.service";
import { EmailDriver } from "./drivers/email.driver";
import { WhatsappDriver } from "./drivers/whatsapp.driver";
import { SmsDriver } from "./drivers/sms.driver";

// Global so auth (password reset) and members (invite emails) can inject the
// dispatch service without importing this module everywhere.
@Global()
@Module({
  providers: [NotificationDispatchService, WeeklyDigestService, EmailDriver, WhatsappDriver, SmsDriver],
  exports: [NotificationDispatchService],
})
export class NotificationsModule {}
