import { Injectable, Logger } from "@nestjs/common";
import type { DriverResult, NotificationDriver, RenderedMessage, ResolvedNotificationSettings } from "./types";

/**
 * Pluggable SMS driver stub (Twilio / MSG91 / TextLocal). Config is stored and
 * the dispatch pipeline treats it as a first-class channel; the provider call
 * is pending a real account, same as the WhatsApp driver.
 */
@Injectable()
export class SmsDriver implements NotificationDriver {
  readonly channel = "SMS" as const;
  private readonly logger = new Logger(SmsDriver.name);

  isConfigured(settings: ResolvedNotificationSettings): boolean {
    return settings.smsEnabled && !!settings.smsApiKey && !!settings.smsProvider;
  }

  async send(recipient: string, message: RenderedMessage): Promise<DriverResult> {
    this.logger.warn(`[stub] SMS to ${recipient}: ${message.text.slice(0, 80)}`);
    return { ok: false, error: "SMS provider integration not implemented (config stored, driver pending)" };
  }
}
