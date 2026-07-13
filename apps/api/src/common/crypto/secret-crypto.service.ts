import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * AES-256-GCM encryption for secrets at rest (payment gateway secret keys,
 * SMTP passwords, WhatsApp/SMS API credentials). These land in the DB only
 * as ciphertext; the ENCRYPTION_KEY never leaves the server. Stored format:
 *   <ivHex>:<authTagHex>:<cipherHex>
 * GCM's auth tag means tampering with a stored ciphertext is detected on
 * decrypt rather than silently returning garbage.
 */
@Injectable()
export class SecretCryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const hexKey = config.get<string>("ENCRYPTION_KEY") ?? "";
    // Validated at boot by env.validation (64 hex chars = 32 bytes), but
    // guard here too so a misconfig fails loudly rather than at first use.
    this.key = Buffer.from(hexKey, "hex");
    if (this.key.length !== 32) {
      throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
    }
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
  }

  decrypt(stored: string): string {
    const [ivHex, authTagHex, cipherHex] = stored.split(":");
    if (!ivHex || !authTagHex || !cipherHex) {
      throw new Error("Malformed encrypted value");
    }
    const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(cipherHex, "hex")), decipher.final()]).toString("utf8");
  }

  /**
   * For API responses: never return a decrypted secret to the browser.
   * Instead surface a masked hint so the UI can show "a secret is set"
   * without exposing it. Returns null when no secret is stored.
   */
  mask(stored: string | null | undefined): string | null {
    if (!stored) return null;
    try {
      const plain = this.decrypt(stored);
      if (plain.length <= 4) return "••••";
      return `${"•".repeat(Math.max(4, plain.length - 4))}${plain.slice(-4)}`;
    } catch {
      return "••••";
    }
  }
}
