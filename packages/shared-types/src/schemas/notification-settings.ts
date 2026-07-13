import { z } from "zod";

export const NOTIFICATION_CHANNELS = ["EMAIL", "WHATSAPP", "SMS"] as const;
export const notificationChannelSchema = z.enum(NOTIFICATION_CHANNELS);
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;

// Secrets are write-only: send a new value to set/replace, omit (or send "")
// to leave the stored value unchanged. They are never returned to the client
// in plaintext -- responses carry a masked hint instead.
const secretField = z.string().max(500).optional();

export const updateNotificationSettingsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  smtpHost: z.string().max(200).optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().max(200).optional(),
  smtpPass: secretField,
  emailFrom: z.string().email().max(200).optional().or(z.literal("")),
  emailFromName: z.string().max(120).optional(),

  whatsappEnabled: z.boolean().optional(),
  whatsappProvider: z.string().max(80).optional(),
  whatsappApiKey: secretField,
  whatsappFrom: z.string().max(80).optional(),

  smsEnabled: z.boolean().optional(),
  smsProvider: z.string().max(80).optional(),
  smsApiKey: secretField,
  smsApiSecret: secretField,
  smsFrom: z.string().max(80).optional(),

  channelPriority: z.array(notificationChannelSchema).length(3).optional(),
});
export type UpdateNotificationSettingsInput = z.infer<typeof updateNotificationSettingsSchema>;

export const sendTestNotificationSchema = z.object({
  recipient: z.string().min(1).max(200),
});
export type SendTestNotificationInput = z.infer<typeof sendTestNotificationSchema>;
