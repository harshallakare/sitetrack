import { z } from "zod";

export const envSchema = z.object({
  API_PORT: z.coerce.number().default(4000),
  JWT_ACCESS_SECRET: z.string().min(8),
  JWT_REFRESH_SECRET: z.string().min(8),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  // Deliberately separate from the tenant JWT_ACCESS_SECRET above -- a
  // leaked tenant secret must not be able to forge admin tokens.
  JWT_ADMIN_SECRET: z.string().min(8),
  JWT_ADMIN_ACCESS_TTL: z.string().default("15m"),
  JWT_ADMIN_REFRESH_TTL: z.string().default("7d"),
  // 32 bytes as 64 hex chars. Encrypts stored secrets (payment keys, SMTP/
  // API credentials) at rest -- see SecretCryptoService.
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY must be 64 hex characters (32 bytes)"),
  UPLOADS_DIR: z.string().default("./uploads"),
  // Where the platform admin's pre-restore safety snapshots land -- never
  // the on-demand "Download Backup" file itself, which streams straight to
  // the browser without ever touching disk here.
  BACKUPS_DIR: z.string().default("./backups"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration:\n${parsed.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`
    );
  }
  return parsed.data;
}
