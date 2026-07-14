#!/usr/bin/env node
// Renders prisma/schema.prisma from prisma/schema.template.prisma by
// substituting the __DB_PROVIDER__ placeholder with DATABASE_PROVIDER, and
// swaps prisma/migrations to match the selected engine.
//
// Prisma does not support choosing `datasource.provider` via env var at
// runtime -- only `url` can be `env(...)`. This script is the workaround:
// it must run before every `prisma generate` / `prisma migrate *` call
// (wired into package.json scripts as a pre-step).
//
// Each engine's migration SQL is engine-specific (different DDL syntax) and
// Prisma locks a migrations folder to one provider via migration_lock.toml,
// so the three histories can't share prisma/migrations directly. The
// per-engine histories live in prisma/engines/<provider>/migrations (real,
// committed files); prisma/migrations itself is a generated/gitignored copy
// of whichever one matches the current DATABASE_PROVIDER -- same pattern as
// schema.prisma being generated from schema.template.prisma.

const fs = require("fs");
const path = require("path");

const VALID_PROVIDERS = ["sqlite", "postgresql", "mysql"];

function loadDotEnv() {
  // Minimal .env loader so this script works standalone without a dependency
  // on `dotenv` being installed yet. Looks at repo root and this package's dir.
  const candidates = [
    path.resolve(__dirname, "../../../.env"),
    path.resolve(__dirname, "../.env"),
  ];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const lines = fs.readFileSync(candidate, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

loadDotEnv();

const provider = (process.env.DATABASE_PROVIDER || "sqlite").trim();

if (!VALID_PROVIDERS.includes(provider)) {
  console.error(
    `[generate-schema] Invalid DATABASE_PROVIDER "${provider}". Must be one of: ${VALID_PROVIDERS.join(", ")}`
  );
  process.exit(1);
}

const templatePath = path.resolve(__dirname, "../prisma/schema.template.prisma");
const outputPath = path.resolve(__dirname, "../prisma/schema.prisma");

const template = fs.readFileSync(templatePath, "utf8");
const rendered = template.replaceAll("__DB_PROVIDER__", provider);

fs.writeFileSync(outputPath, rendered, "utf8");

console.log(`[generate-schema] Rendered prisma/schema.prisma with provider="${provider}"`);

function syncMigrations() {
  const sourceDir = path.resolve(__dirname, `../prisma/engines/${provider}/migrations`);
  const targetDir = path.resolve(__dirname, "../prisma/migrations");

  if (!fs.existsSync(sourceDir)) {
    console.error(
      `[generate-schema] No migration history for provider="${provider}" yet ` +
        `(expected prisma/engines/${provider}/migrations). Create one by running ` +
        `'prisma migrate dev --name init' against a real ${provider} database, ` +
        `then move the generated prisma/migrations into prisma/engines/${provider}/migrations.`
    );
    process.exit(1);
  }

  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true });
  console.log(`[generate-schema] Synced prisma/migrations from prisma/engines/${provider}/migrations`);
}

syncMigrations();
