# Single-image production build: runs both apps/api and apps/web in one
# container (docker-entrypoint.sh starts api, then web, alongside each
# other). Simpler to build/push/run than two separate images, at the cost
# of losing independent scaling/restart of api vs web -- fine for a single
# small deployment. Run from the repo root:
#   docker build -t sitetrack .
# (docker-compose.prod.yml already sets the right build context.)

FROM node:20-alpine AS base
# openssl is required by Prisma's query engine on musl (alpine). bash backs
# docker-entrypoint.sh's `wait -n` (not supported by alpine's default ash).
RUN apk add --no-cache openssl libc6-compat bash
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

# --- deps: install once, cached unless a package.json changes ---
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --frozen-lockfile

# --- build: compile both api and web + their workspace dependencies ---
FROM deps AS build
COPY . .
# Baked in at build time -- Prisma can't switch datasource provider via env at
# runtime, only the connection URL can be. Override for postgresql/mysql/sqlite.
ARG DATABASE_PROVIDER=sqlite
ENV DATABASE_PROVIDER=$DATABASE_PROVIDER
RUN pnpm turbo run build --filter=@sitetrack/api... --filter=@sitetrack/web...

# --- runtime: same base image (matching musl engine binary), no dev toolchain ---
FROM base AS runtime
ENV NODE_ENV=production
# pg_dump/pg_restore back the admin panel's database backup/restore feature.
# postgresql16-client matches the postgres:16-alpine server documented in
# DEPLOY.md -- keep these in step if that version ever changes.
# mysql-client is included for the (unverified/untested) MySQL backup path.
RUN apk add --no-cache postgresql16-client mysql-client
WORKDIR /repo
COPY --from=build /repo ./
COPY docker-entrypoint.sh /repo/docker-entrypoint.sh
RUN chmod +x /repo/docker-entrypoint.sh

EXPOSE 3000 4000
ENTRYPOINT ["/repo/docker-entrypoint.sh"]
