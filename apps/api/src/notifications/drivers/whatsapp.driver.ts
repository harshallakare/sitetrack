import { Injectable, Logger } from "@nestjs/common";
import type { DriverResult, NotificationDriver, RenderedMessage, ResolvedNotificationSettings } from "./types";

/**
 * Pluggable WhatsApp driver. Same philosophy as the payment-gateway registry:
 * the config + dispatch pipeline is real, but the actual provider call is a
 * stub until wired to a specific provider (Meta Cloud API / Twilio / Gupshup),
 * which needs a real account. Logs the attempt so the pipeline is verifiable.
 */
@Injectable()
export class WhatsappDriver implements NotificationDriver {
  readonly channel = "WHATSAPP" as const;
  private readonly logger = new Logger(WhatsappDriver.name);

  isConfigured(settings: ResolvedNotificationSettings): boolean {
    return settings.whatsappEnabled && !!settings.whatsappApiKey && !!settings.whatsappProvider;
  }

  async send(recipient: string, message: RenderedMessage): Promise<DriverResult> {
    // TODO: dispatch to the configured provider's API. Until then this is a
    // recorded no-op so channel fallthrough and logging are testable.
    this.logger.warn(`[stub] WhatsApp to ${recipient}: ${message.text.slice(0, 80)}`);
    return { ok: false, error: "WhatsApp provider integration not implemented (config stored, driver pending)" };
  }
}
