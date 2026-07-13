#!/usr/bin/env node
// Renders prisma/schema.prisma from prisma/schema.template.prisma by
// substituting the __DB_PROVIDER__ placeholder with DATABASE_PROVIDER.
//
// Prisma does not support choosing `datasource.provider` via env var at
// runtime -- only `url` can be `env(...)`. This script is the workaround:
// it must run before every `prisma generate` / `prisma migrate *` call
// (wired into package.json scripts as a pre-step).

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
