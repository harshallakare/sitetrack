import type { NotificationChannel } from "@sitetrack/shared-types";

/** Fully-resolved (decrypted) notification settings the drivers operate on. */
export interface ResolvedNotificationSettings {
  emailEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPass: string | null;
  emailFrom: string | null;
  emailFromName: string | null;

  whatsappEnabled: boolean;
  whatsappProvider: string | null;
  whatsappApiKey: string | null;
  whatsappFrom: string | null;

  smsEnabled: boolean;
  smsProvider: string | null;
  smsApiKey: string | null;
  smsApiSecret: string | null;
  smsFrom: string | null;

  channelPriority: NotificationChannel[];
}

export interface RenderedMessage {
  subject: string;
  /** Plaintext body (used for SMS/WhatsApp and email text part). */
  text: string;
  /** Optional HTML body for email. */
  html?: string;
}

export interface DriverResult {
  ok: boolean;
  /** Provider-specific detail or, in preview mode, the composed message. */
  detail?: string;
  error?: string;
}

export interface NotificationDriver {
  readonly channel: NotificationChannel;
  /** Whether this channel has enough config to attempt a send. */
  isConfigured(settings: ResolvedNotificationSettings): boolean;
  send(recipient: string, message: RenderedMessage, settings: ResolvedNotificationSettings): Promise<DriverResult>;
}
