#!/usr/bin/env bash
# Pulls the latest code, rebuilds only what changed, and recreates
# containers -- the normal path for every deploy after the first
# (./scripts/deploy.sh). Migrations run automatically on api startup
# (apps/api/docker-entrypoint.sh), so schema changes ship with no extra step.
#
# Usage:
#   ./scripts/update.sh              # git pull + rebuild + redeploy
#   ./scripts/update.sh --no-pull     # rebuild + redeploy from the current checkout
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
DO_PULL=1

for arg in "$@"; do
  case "$arg" in
    --no-pull) DO_PULL=0 ;;
    *) echo "[update] unknown flag: $arg" >&2; exit 1 ;;
  esac
done

log() { echo "[update] $*"; }
die() { echo "[update] ERROR: $*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || die "$ENV_FILE not found. Run ./scripts/deploy.sh first."

if [ "$DO_PULL" -eq 1 ]; then
  if [ ! -d .git ]; then
    die "Not a git checkout -- use --no-pull if code was updated some other way."
  fi
  if [ -n "$(git status --porcelain)" ]; then
    die "Uncommitted local changes on the server would be overwritten by 'git pull'. Commit, stash, or discard them first, or re-run with --no-pull."
  fi
  log "Pulling latest changes..."
  git pull --ff-only
fi

log "Rebuilding changed images..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

log "Recreating containers (only ones with a changed image are restarted)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans

log "Pruning dangling images from the previous build..."
docker image prune -f >/dev/null

log "Status:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

log "Recent API logs:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail=20 api
