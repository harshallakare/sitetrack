#!/usr/bin/env bash
# First-time production deploy. Run this ON THE SERVER, from a clone of this
# repo. Idempotent-ish: safe to re-run, but scripts/update.sh is the normal
# path for every deploy after the first one.
#
# Usage: ./scripts/deploy.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

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
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

# --- 4. Start the stack ---
log "Starting the stack (postgres -> api [runs migrations] -> web -> caddy)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

log "Waiting for the API to come up..."
for i in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs api 2>/dev/null | grep -q "listening on"; then
    log "API is up."
    break
  fi
  sleep 2
  if [ "$i" -eq 30 ]; then
    log "API didn't report ready in time -- check logs: docker compose -f $COMPOSE_FILE logs api"
  fi
done

log "Deployed. Status:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

DOMAIN_VAL="$(grep -m1 '^DOMAIN=' "$ENV_FILE" | cut -d= -f2)"
log "Visit http://${DOMAIN_VAL:-localhost} (https:// automatically if DOMAIN is a real domain with DNS pointed here)."
log "Logs:   docker compose -f $COMPOSE_FILE logs -f"
log "Update: ./scripts/update.sh"
