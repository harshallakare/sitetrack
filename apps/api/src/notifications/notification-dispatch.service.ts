import { Injectable, Logger } from "@nestjs/common";
import type { NotificationChannel } from "@sitetrack/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { SecretCryptoService } from "../common/crypto/secret-crypto.service";
import { EmailDriver } from "./drivers/email.driver";
import { WhatsappDriver } from "./drivers/whatsapp.driver";
import { SmsDriver } from "./drivers/sms.driver";
import type { NotificationDriver, ResolvedNotificationSettings } from "./drivers/types";
import { renderTemplate, type NotificationTemplate } from "./templates";

const SINGLETON_ID = "singleton";
const DEFAULT_PRIORITY: NotificationChannel[] = ["EMAIL", "WHATSAPP", "SMS"];

export interface DispatchRequest {
  recipient: string;
  template: NotificationTemplate;
  organizationId?: string | null;
}

export interface DispatchOutcome {
  delivered: boolean;
  channel?: NotificationChannel;
  attempts: Array<{ channel: NotificationChannel; ok: boolean; detail?: string; error?: string }>;
}

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);
  private readonly drivers: Record<NotificationChannel, NotificationDriver>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: SecretCryptoService,
    email: EmailDriver,
    whatsapp: WhatsappDriver,
    sms: SmsDriver
  ) {
    this.drivers = { EMAIL: email, WHATSAPP: whatsapp, SMS: sms };
  }

  /**
   * Tries each enabled+configured channel in priority order, stopping at the
   * first success. Every attempt is recorded in NotificationLog. Never throws
   * -- notification failure must not break the operation that triggered it.
   */
  async dispatch(req: DispatchRequest): Promise<DispatchOutcome> {
    const settings = await this.resolveSettings();
    const message = renderTemplate(req.template);
    const outcome: DispatchOutcome = { delivered: false, attempts: [] };

    for (const channel of settings.channelPriority) {
      const driver = this.drivers[channel];
      const channelEnabled = this.isChannelEnabled(channel, settings);
      if (!channelEnabled || !driver.isConfigured(settings)) {
        outcome.attempts.push({ channel, ok: false, error: "channel disabled or not configured" });
        continue;
      }

      let result;
      try {
        result = await driver.send(req.recipient, message, settings);
      } catch (err) {
        result = { ok: false, error: err instanceof Error ? err.message : "driver threw" };
      }

      outcome.attempts.push({ channel, ok: result.ok, detail: result.detail, error: result.error });
      await this.log(req, channel, result.ok ? "SENT" : "FAILED", message.subject, result.error);

      if (result.ok) {
        outcome.delivered = true;
        outcome.channel = channel;
        return outcome;
      }
    }

    if (!outcome.delivered) {
      this.logger.warn(`No channel delivered notification "${req.template.name}" to ${req.recipient}`);
    }

    // Opportunistic retention: roughly 1-in-20 dispatches prunes delivery
    // logs older than 90 days, so the table can't grow unbounded without
    // needing a separate scheduler. Best-effort by design.
    if (Math.random() < 0.05) {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      await this.prisma.unscoped.notificationLog
        .deleteMany({ where: { createdAt: { lt: cutoff } } })
        .catch(() => undefined);
    }

    return outcome;
  }

  private isChannelEnabled(channel: NotificationChannel, s: ResolvedNotificationSettings): boolean {
    if (channel === "EMAIL") return s.emailEnabled;
    if (channel === "WHATSAPP") return s.whatsappEnabled;
    return s.smsEnabled;
  }

  private async log(
    req: DispatchRequest,
    channel: NotificationChannel,
    status: "SENT" | "FAILED",
    subject: string,
    error?: string
  ) {
    await this.prisma.unscoped.notificationLog
      .create({
        data: {
          organizationId: req.organizationId ?? null,
          channel,
          recipient: req.recipient,
          template: req.template.name,
          subject,
          status,
          error: error ?? null,
        },
      })
      .catch(() => undefined);
  }

  private async resolveSettings(): Promise<ResolvedNotificationSettings> {
    const row = await this.prisma.unscoped.notificationSettings.upsert({
      where: { id: SINGLETON_ID },
      update: {},
      create: { id: SINGLETON_ID },
    });

    const dec = (v: string | null) => (v ? safeDecrypt(this.crypto, v) : null);

    return {
      emailEnabled: row.emailEnabled,
      smtpHost: row.smtpHost,
      smtpPort: row.smtpPort,
      smtpSecure: row.smtpSecure,
      smtpUser: row.smtpUser,
      smtpPass: dec(row.smtpPassEnc),
      emailFrom: row.emailFrom,
      emailFromName: row.emailFromName,
      whatsappEnabled: row.whatsappEnabled,
      whatsappProvider: row.whatsappProvider,
      whatsappApiKey: dec(row.whatsappApiKeyEnc),
      whatsappFrom: row.whatsappFrom,
      smsEnabled: row.smsEnabled,
      smsProvider: row.smsProvider,
      smsApiKey: dec(row.smsApiKeyEnc),
      smsApiSecret: dec(row.smsApiSecretEnc),
      smsFrom: row.smsFrom,
      channelPriority: parsePriority(row.channelPriority),
    };
  }
}

function safeDecrypt(crypto: SecretCryptoService, value: string): string | null {
  try {
    return crypto.decrypt(value);
  } catch {
    return null;
  }
}

function parsePriority(raw: string): NotificationChannel[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 3) return parsed as NotificationChannel[];
  } catch {
    // fall through
  }
  return DEFAULT_PRIORITY;
}
