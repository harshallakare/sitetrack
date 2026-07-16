#!/usr/bin/env bash
# Pulls the latest code, rebuilds only what changed, and recreates
# containers -- the normal path for every deploy after the first
# (./scripts/deploy.sh). Migrations run automatically on app container
# startup (docker-entrypoint.sh), so schema changes ship with no extra step.
#
# Usage:
#   ./scripts/update.sh                # git pull + rebuild + redeploy
#   ./scripts/update.sh --no-pull       # rebuild + redeploy from the current checkout
#   ./scripts/update.sh --with-caddy    # also (re)start the bundled Caddy --
#                                       # pass this if your first deploy.sh used it
#   ./scripts/update.sh --proxy-network # keep app on the containerized reverse
#                                       # proxy's Docker network -- pass this if
#                                       # your first deploy.sh used it
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILES=(-f docker-compose.prod.yml)
DO_PULL=1
PROFILE_ARGS=()
USE_PROXY_NETWORK=0

print_help() {
  cat <<'HELP'
Usage: ./scripts/update.sh [options]

Pulls the latest code, rebuilds only what changed, and recreates
containers -- the normal path for every deploy after the first
(./scripts/deploy.sh). Migrations run automatically on app startup, so
schema changes ship with no extra step.

Options:
  --no-pull         Rebuild/redeploy from the current checkout without
                     touching git (useful if you deployed a specific commit
                     or tag by hand).
  --with-caddy      Also (re)start the bundled Caddy service -- pass this if
                     your first ./scripts/deploy.sh used it.
  --proxy-network   Keep app attached to the containerized reverse proxy's
                     Docker network (PROXY_NETWORK_NAME in .env.production)
                     -- pass this if your first ./scripts/deploy.sh used it.
  -h, --help        Show this help and exit.

Examples:
  ./scripts/update.sh                        # git pull + rebuild + redeploy
  ./scripts/update.sh --no-pull               # rebuild from current checkout
  ./scripts/update.sh --with-caddy            # keep Caddy running too
  ./scripts/update.sh --proxy-network         # keep the proxy network attached
  ./scripts/update.sh --no-pull --with-caddy  # combine flags freely
HELP
}

for arg in "$@"; do
  case "$arg" in
    --no-pull) DO_PULL=0 ;;
    --with-caddy) PROFILE_ARGS=(--profile caddy) ;;
    --proxy-network) USE_PROXY_NETWORK=1 ;;
    -h|--help) print_help; exit 0 ;;
    *) echo "[update] unknown flag: $arg" >&2; print_help >&2; exit 1 ;;
  esac
done

log() { echo "[update] $*"; }
die() { echo "[update] ERROR: $*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || die "$ENV_FILE not found. Run ./scripts/deploy.sh first."

if [ "$USE_PROXY_NETWORK" -eq 1 ]; then
  COMPOSE_FILES+=(-f docker-compose.proxy-net.yml)
fi

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
docker compose "${COMPOSE_FILES[@]}" --env-file "$ENV_FILE" "${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"}" build

log "Recreating containers (only ones with a changed image are restarted)..."
docker compose "${COMPOSE_FILES[@]}" --env-file "$ENV_FILE" "${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"}" up -d --remove-orphans

log "Pruning dangling images from the previous build..."
docker image prune -f >/dev/null

log "Status:"
docker compose "${COMPOSE_FILES[@]}" --env-file "$ENV_FILE" "${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"}" ps

log "Recent app logs:"
docker compose "${COMPOSE_FILES[@]}" --env-file "$ENV_FILE" logs --tail=20 app
