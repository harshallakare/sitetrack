import { Injectable } from "@nestjs/common";
import type { NotificationChannel, UpdateNotificationSettingsInput } from "@sitetrack/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { SecretCryptoService } from "../common/crypto/secret-crypto.service";

const SINGLETON_ID = "singleton";
const DEFAULT_PRIORITY: NotificationChannel[] = ["EMAIL", "WHATSAPP", "SMS"];

@Injectable()
export class NotificationSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: SecretCryptoService
  ) {}

  /** Returns settings with secrets MASKED (never plaintext) for the admin UI. */
  async get() {
    const row = await this.prisma.unscoped.notificationSettings.upsert({
      where: { id: SINGLETON_ID },
      update: {},
      create: { id: SINGLETON_ID },
    });

    return {
      emailEnabled: row.emailEnabled,
      smtpHost: row.smtpHost,
      smtpPort: row.smtpPort,
      smtpSecure: row.smtpSecure,
      smtpUser: row.smtpUser,
      smtpPassMasked: this.crypto.mask(row.smtpPassEnc),
      emailFrom: row.emailFrom,
      emailFromName: row.emailFromName,

      whatsappEnabled: row.whatsappEnabled,
      whatsappProvider: row.whatsappProvider,
      whatsappApiKeyMasked: this.crypto.mask(row.whatsappApiKeyEnc),
      whatsappFrom: row.whatsappFrom,

      smsEnabled: row.smsEnabled,
      smsProvider: row.smsProvider,
      smsApiKeyMasked: this.crypto.mask(row.smsApiKeyEnc),
      smsApiSecretMasked: this.crypto.mask(row.smsApiSecretEnc),
      smsFrom: row.smsFrom,

      channelPriority: this.parsePriority(row.channelPriority),
    };
  }

  async update(input: UpdateNotificationSettingsInput) {
    // Secrets: a provided non-empty value replaces the stored ciphertext; an
    // omitted or empty value leaves the existing secret untouched.
    const data: Record<string, unknown> = {};

    assignIfDefined(data, "emailEnabled", input.emailEnabled);
    assignIfDefined(data, "smtpHost", input.smtpHost);
    assignIfDefined(data, "smtpPort", input.smtpPort);
    assignIfDefined(data, "smtpSecure", input.smtpSecure);
    assignIfDefined(data, "smtpUser", input.smtpUser);
    assignIfDefined(data, "emailFrom", input.emailFrom);
    assignIfDefined(data, "emailFromName", input.emailFromName);
    this.assignSecret(data, "smtpPassEnc", input.smtpPass);

    assignIfDefined(data, "whatsappEnabled", input.whatsappEnabled);
    assignIfDefined(data, "whatsappProvider", input.whatsappProvider);
    assignIfDefined(data, "whatsappFrom", input.whatsappFrom);
    this.assignSecret(data, "whatsappApiKeyEnc", input.whatsappApiKey);

    assignIfDefined(data, "smsEnabled", input.smsEnabled);
    assignIfDefined(data, "smsProvider", input.smsProvider);
    assignIfDefined(data, "smsFrom", input.smsFrom);
    this.assignSecret(data, "smsApiKeyEnc", input.smsApiKey);
    this.assignSecret(data, "smsApiSecretEnc", input.smsApiSecret);

    if (input.channelPriority) {
      data.channelPriority = JSON.stringify(input.channelPriority);
    }

    await this.prisma.unscoped.notificationSettings.upsert({
      where: { id: SINGLETON_ID },
      update: data,
      create: { id: SINGLETON_ID, ...data },
    });

    return this.get();
  }

  private assignSecret(data: Record<string, unknown>, field: string, value: string | undefined) {
    if (value !== undefined && value !== "") {
      data[field] = this.crypto.encrypt(value);
    }
  }

  private parsePriority(raw: string): NotificationChannel[] {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 3) return parsed as NotificationChannel[];
    } catch {
      // fall through
    }
    return DEFAULT_PRIORITY;
  }
}

function assignIfDefined(data: Record<string, unknown>, field: string, value: unknown) {
  if (value !== undefined) data[field] = value;
}
