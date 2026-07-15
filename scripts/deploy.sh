#!/usr/bin/env bash
# First-time production deploy. Run this ON THE SERVER, from a clone of this
# repo. Idempotent-ish: safe to re-run, but scripts/update.sh is the normal
# path for every deploy after the first one.
#
# Usage:
#   ./scripts/deploy.sh              # single `app` container on 127.0.0.1
#                                     # -- bring your own reverse proxy (nginx, etc.)
#   ./scripts/deploy.sh --with-caddy # also start the bundled Caddy for
#                                     # automatic public HTTPS (needs 80/443
#                                     # free -- see DEPLOY.md)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
PROFILE_ARGS=()

print_help() {
  cat <<'HELP'
Usage: ./scripts/deploy.sh [options]

First-time production deploy. Run this ON THE SERVER, from a clone of this
repo. Builds the single `app` image (runs both api and web in one
container, migrations included) and prints where to point a reverse proxy.
Safe to re-run; scripts/update.sh is the normal path for every deploy after
the first one.

Options:
  --with-caddy   Also start the bundled Caddy service for automatic public
                 HTTPS. Needs ports 80/443 free on this server. Omit this if
                 you already have your own nginx/Caddy/etc. in front (see
                 "Running alongside an existing site" in DEPLOY.md).
  -h, --help     Show this help and exit.

Examples:
  ./scripts/deploy.sh              # app on 127.0.0.1, bring your own proxy
  ./scripts/deploy.sh --with-caddy # also start Caddy (no existing proxy)
HELP
}

for arg in "$@"; do
  case "$arg" in
    --with-caddy) PROFILE_ARGS=(--profile caddy) ;;
    -h|--help) print_help; exit 0 ;;
    *) echo "[deploy] unknown flag: $arg" >&2; print_help >&2; exit 1 ;;
  esac
done

log() { echo "[deploy] $*"; }
die() { echo "[deploy] ERROR: $*" >&2; exit 1; }

# --- 1. Prerequisites ---
command -v docker >/dev/null 2>&1 || die "docker is not installed. Install Docker Engine first: https://docs.docker.com/engine/install/"
docker compose version >/dev/null 2>&1 || die "docker compose plugin not found (need 'docker compose', not the old standalone 'docker-compose')."

# --- 2. Env file ---
if [ ! -f "$ENV_FILE" ]; then
  log "$ENV_FILE not found -- creating it from .env.production.example."
  cp .env.production.example "$ENV_FILE"
  die "Fill in the real secrets and DOMAIN in $ENV_FILE, then re-run this script.
  Generate secrets with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
fi

if grep -q "change-me" "$ENV_FILE"; then
  die "$ENV_FILE still has placeholder 'change-me' values. Fill in real secrets/passwords before deploying."
fi

# --- 3. Build images ---
log "Building images (this generates the Prisma client for DATABASE_PROVIDER=$(grep -m1 '^DATABASE_PROVIDER=' "$ENV_FILE" | cut -d= -f2))..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "${PROFILE_ARGS[@]}" build

# --- 4. Start the stack ---
log "Starting the stack (app [runs migrations, then api + web]${PROFILE_ARGS[*]:+ -> caddy})..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "${PROFILE_ARGS[@]}" up -d

log "Waiting for the app to come up..."
for i in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs app 2>/dev/null | grep -q "listening on"; then
    log "App is up."
    break
  fi
  sleep 2
  if [ "$i" -eq 30 ]; then
    log "App didn't report ready in time -- check logs: docker compose -f $COMPOSE_FILE logs app"
  fi
done

log "Deployed. Status:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "${PROFILE_ARGS[@]}" ps

if [ -n "${PROFILE_ARGS[*]:-}" ]; then
  DOMAIN_VAL="$(grep -m1 '^DOMAIN=' "$ENV_FILE" | cut -d= -f2)"
  log "Visit http://${DOMAIN_VAL:-localhost} (https:// automatically if DOMAIN is a real domain with DNS pointed here)."
else
  WEB_PORT_VAL="$(grep -m1 '^WEB_HOST_BIND_PORT=' "$ENV_FILE" | cut -d= -f2)"
  API_PORT_VAL="$(grep -m1 '^API_HOST_BIND_PORT=' "$ENV_FILE" | cut -d= -f2)"
  log "web is listening on 127.0.0.1:${WEB_PORT_VAL:-3000}, api on 127.0.0.1:${API_PORT_VAL:-4000} (/webhooks/* only)."
  log "Point your existing reverse proxy at those -- see 'Running alongside an existing site' in DEPLOY.md."
fi
log "Logs:   docker compose -f $COMPOSE_FILE logs -f"
log "Update: ./scripts/update.sh"
