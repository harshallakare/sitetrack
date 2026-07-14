# Builds @sitetrack/api as part of the pnpm/turbo monorepo. Run from the
# repo root: docker build -f apps/api/Dockerfile -t sitetrack-api .
# (docker-compose.prod.yml already sets the right build context.)

FROM node:20-alpine AS base
# openssl is required by Prisma's query engine on musl (alpine); generating
# the client in this same base image guarantees the engine binary matches
# what the runtime stage will actually execute against.
RUN apk add --no-cache openssl libc6-compat
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

# --- build: compile api + its workspace dependencies (database, shared-types) ---
FROM deps AS build
COPY . .
# Baked in at build time -- Prisma can't switch datasource provider via env at
# runtime, only the connection URL can be. Override for postgresql/mysql/sqlite.
ARG DATABASE_PROVIDER=postgresql
ENV DATABASE_PROVIDER=$DATABASE_PROVIDER
RUN pnpm turbo run build --filter=@sitetrack/api...

# --- runtime: same base image (matching musl engine binary), no dev toolchain ---
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo ./
COPY apps/api/docker-entrypoint.sh /repo/docker-entrypoint.sh
RUN chmod +x /repo/docker-entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["/repo/docker-entrypoint.sh"]
CMD ["node", "apps/api/dist/main.js"]
