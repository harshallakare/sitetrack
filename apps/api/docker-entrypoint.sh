#!/bin/sh
# Applies pending migrations against whatever DATABASE_URL points at, then
# starts the API. Runs on every container start (not just first deploy) --
# `prisma migrate deploy` is a no-op when there's nothing new to apply, so
# this is what makes `update.sh` safe to re-run after a schema change.
set -e

echo "[entrypoint] applying database migrations..."
pnpm --filter @sitetrack/database db:migrate:deploy

echo "[entrypoint] starting API..."
exec "$@"
