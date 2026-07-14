# SiteTrack

Multi-tenant construction site expense tracker. Organizations track sites,
vendors, deliveries, budgets, and payments; a separate platform admin panel
manages tenants, plans, notification channels, and payment gateways.

## Stack

- **Web**: Next.js (App Router) + Tailwind, proxies all API calls server-side
- **API**: NestJS + Prisma, multi-tenant via a flat `organizationId` column
  enforced by a Prisma Client Extension
- **Database**: SQLite by default (local dev), Postgres or MySQL in
  production — one schema template renders per engine
- **Monorepo**: pnpm workspaces + Turborepo (`apps/web`, `apps/api`,
  `packages/database`, `packages/shared-types`, `packages/config`)

## Local development

```bash
pnpm install
pnpm db:migrate:dev      # SQLite by default
pnpm db:seed             # optional demo data
pnpm dev                 # web on :3000, api on :4000
```

Copy `.env.example` into `apps/api/.env` and `packages/database/.env` first —
see that file for what each variable does.

## Key architecture notes

- **Tenant isolation**: every tenant-owned table has a flat `organizationId`
  column. `PrismaService.db` (a Prisma Client Extension) auto-scopes every
  query to the current request's org, read from `nestjs-cls` request
  context, and fails closed if that context is missing.
- **Two separate auth domains**: customer login (`/login`) and platform
  admin login (`/admin/login`) use different JWT secrets, different cookies,
  and different session tables — a leaked customer token can't forge an
  admin session.
- **Cross-engine Prisma**: `packages/database/prisma/schema.template.prisma`
  is the source of truth; `scripts/generate-schema.js` renders the real
  `schema.prisma` per `DATABASE_PROVIDER`. Each engine keeps its own
  migration history under `prisma/engines/<provider>/migrations` (SQL syntax
  isn't portable between engines, only the schema shape is).

## Production deployment

See [DEPLOY.md](DEPLOY.md) — a Docker Compose stack (Postgres + API + web +
Caddy for automatic HTTPS) that runs on any server with Docker installed,
plus `scripts/deploy.sh` / `scripts/update.sh` for first deploy and updates.

## Testing

```bash
pnpm --filter @sitetrack/api test
```

Includes a cross-tenant isolation end-to-end test that boots the real
`AppModule` against a throwaway SQLite database and asserts two orgs can
never see each other's data — the regression guard for the whole
multi-tenancy model.
