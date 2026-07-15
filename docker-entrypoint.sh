#!/usr/bin/env bash
# Runs both apps/api and apps/web in this single container: applies pending
# migrations, then starts both processes side by side. If either one dies,
# the other is stopped and the container exits -- so `restart: unless-stopped`
# notices and recovers both, instead of silently running with only one half
# working.
set -e

echo "[entrypoint] applying database migrations..."
pnpm --filter @sitetrack/database db:migrate:deploy

echo "[entrypoint] starting API..."
node apps/api/dist/main.js &
API_PID=$!

echo "[entrypoint] starting web..."
pnpm --filter @sitetrack/web start &
WEB_PID=$!

shutdown() {
  echo "[entrypoint] shutting down..."
  kill -TERM "$API_PID" "$WEB_PID" 2>/dev/null || true
  wait "$API_PID" "$WEB_PID" 2>/dev/null || true
  exit 0
}
trap shutdown SIGTERM SIGINT

set +e
wait -n "$API_PID" "$WEB_PID"
EXIT_CODE=$?
set -e
echo "[entrypoint] a process exited (code $EXIT_CODE) -- stopping the other and exiting."
kill -TERM "$API_PID" "$WEB_PID" 2>/dev/null || true
wait "$API_PID" "$WEB_PID" 2>/dev/null || true
exit "$EXIT_CODE"
