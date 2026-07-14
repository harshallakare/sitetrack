# Builds @sitetrack/web as part of the pnpm/turbo monorepo. Run from the
# repo root: docker build -f apps/web/Dockerfile -t sitetrack-web .
# (docker-compose.prod.yml already sets the right build context.)

FROM node:20-alpine AS base
# The workspace-wide pnpm install pulls in @prisma/client's postinstall
# (a transitive dep of @sitetrack/database/api, hoisted into this image's
# node_modules too) -- openssl silences its "could not detect libssl" probe,
# even though this image never actually generates/runs the Prisma client.
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

# --- build: compile web + its workspace dependency (shared-types) ---
FROM deps AS build
COPY . .
RUN pnpm turbo run build --filter=@sitetrack/web...

# --- runtime ---
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo ./

EXPOSE 3000
CMD ["pnpm", "--filter", "@sitetrack/web", "start"]
