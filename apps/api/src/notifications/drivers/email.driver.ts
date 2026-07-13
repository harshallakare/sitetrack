import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import type { DriverResult, NotificationDriver, RenderedMessage, ResolvedNotificationSettings } from "./types";

/**
 * Real SMTP delivery via nodemailer when an SMTP host is configured. When no
 * host is set, falls back to nodemailer's jsonTransport "preview" mode, which
 * composes the full MIME message WITHOUT sending -- so the pipeline (template
 * rendering, from/to, channel selection) is fully exercisable locally without
 * a mail server, and swaps to real delivery the moment a host is filled in.
 */
@Injectable()
export class EmailDriver implements NotificationDriver {
  readonly channel = "EMAIL" as const;
  private readonly logger = new Logger(EmailDriver.name);

  isConfigured(settings: ResolvedNotificationSettings): boolean {
    // Email can always at least preview; treat "enabled" as configured so the
    // dispatcher will attempt it. Real delivery additionally needs smtpHost.
    return settings.emailEnabled;
  }

  async send(
    recipient: string,
    message: RenderedMessage,
    settings: ResolvedNotificationSettings
  ): Promise<DriverResult> {
    const previewMode = !settings.smtpHost;
    const transport = previewMode
      ? nodemailer.createTransport({ jsonTransport: true })
      : nodemailer.createTransport({
          host: settings.smtpHost!,
          port: settings.smtpPort ?? 587,
          secure: settings.smtpSecure,
          auth: settings.smtpUser ? { user: settings.smtpUser, pass: settings.smtpPass ?? "" } : undefined,
        });

    // `||` (not `??`): the settings form can legitimately store "" for these,
    // and an empty from-address would produce a malformed header like
    // `"Name" <>` that real SMTP servers reject.
    const fromAddress = settings.emailFrom || "no-reply@sitetrack.local";
    const from = settings.emailFromName ? `"${settings.emailFromName}" <${fromAddress}>` : fromAddress;

    try {
      const info = await transport.sendMail({
        from,
        to: recipient,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      if (previewMode) {
        this.logger.warn(`[preview] email to ${recipient} composed but NOT sent (no SMTP host configured)`);
        // jsonTransport returns the composed MIME on `.message` (not in the
        // SMTP type), so read it off an untyped view.
        const composed = (info as unknown as { message?: unknown }).message;
        return { ok: true, detail: `preview (not delivered): ${String(composed).slice(0, 400)}` };
      }
      return { ok: true, detail: `sent: ${info.messageId}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "SMTP send failed" };
    }
  }
}
