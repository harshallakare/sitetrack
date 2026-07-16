#!/usr/bin/env bash
# First-time production deploy. Run this ON THE SERVER, from a clone of this
# repo. Fully interactive on a real terminal -- no file editing required:
# it generates secrets itself and asks only for the couple of things it
# can't know (domain, admin login). Idempotent-ish: safe to re-run, but
# scripts/update.sh is the normal path for every deploy after the first one.
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
Run interactively (a real terminal), it generates all secrets itself and
asks only for what it can't know -- your domain (if using --with-caddy) and
your first admin login -- no manual file editing needed. Safe to re-run;
scripts/update.sh is the normal path for every deploy after the first one.

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
INTERACTIVE=0
[ -t 0 ] && [ -t 1 ] && INTERACTIVE=1

# Random hex string, without assuming Node/Python are installed on the host
# (only Docker is required here -- see DEPLOY.md).
gen_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  elif command -v node >/dev/null 2>&1; then
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c "import secrets; print(secrets.token_hex(32))"
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

# Replaces a KEY=... line in $ENV_FILE in place (BSD/GNU sed compatible).
set_env_var() {
  local key="$1" value="$2"
  local escaped_value
  escaped_value="$(printf '%s' "$value" | sed -e 's/[\/&]/\\&/g')"
  sed -i.bak -E "s/^${key}=.*/${key}=${escaped_value}/" "$ENV_FILE"
  rm -f "${ENV_FILE}.bak"
}

get_env_var() {
  # `|| true` -- a commented-out/absent optional var (e.g. WEB_HOST_BIND_PORT)
  # is a normal "not found", not a script-ending failure under set -e/pipefail.
  grep -m1 "^$1=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true
}

ask() {
  local prompt="$1" default="$2" reply
  if [ "$INTERACTIVE" -eq 1 ]; then
    read -r -p "$prompt [$default]: " reply || true
  fi
  echo "${reply:-$default}"
}

# --- 1. Prerequisites ---
command -v docker >/dev/null 2>&1 || die "docker is not installed. Install Docker Engine first: https://docs.docker.com/engine/install/"
docker compose version >/dev/null 2>&1 || die "docker compose plugin not found (need 'docker compose', not the old standalone 'docker-compose')."

# --- 2. Env file: create/complete it automatically, no manual editing ---
if [ ! -f "$ENV_FILE" ]; then
  log "$ENV_FILE not found -- creating it from .env.production.example."
  cp .env.production.example "$ENV_FILE"
fi

if grep -v '^#' "$ENV_FILE" | grep -q "change-me"; then
  log "Filling in secrets and domain (only asked once, saved to $ENV_FILE)..."

  DOMAIN_VAL="localhost"
  if [ -n "${PROFILE_ARGS[*]:-}" ]; then
    DOMAIN_VAL="$(ask "Domain for this deployment (DNS must already point here for HTTPS; leave blank for plain HTTP on this server's IP)" "localhost")"
  fi
  set_env_var "DOMAIN" "$DOMAIN_VAL"
  if [ "$DOMAIN_VAL" = "localhost" ]; then
    set_env_var "CORS_ORIGIN" "http://localhost:3000"
  else
    set_env_var "CORS_ORIGIN" "https://${DOMAIN_VAL}"
  fi

  # These are just random values -- nobody should hand-type them, so
  # generate and fill them in silently rather than asking. gen_secret always
  # returns 64 hex chars, which is exactly what ENCRYPTION_KEY requires.
  set_env_var "JWT_ACCESS_SECRET" "$(gen_secret)"
  set_env_var "JWT_REFRESH_SECRET" "$(gen_secret)"
  set_env_var "JWT_ADMIN_SECRET" "$(gen_secret)"
  set_env_var "ENCRYPTION_KEY" "$(gen_secret)"

  if grep -v '^#' "$ENV_FILE" | grep -q "change-me"; then
    die "$ENV_FILE still has placeholder values after auto-fill -- inspect it manually (unexpected)."
  fi
  log "$ENV_FILE is ready."
fi

# --- 3. Build images ---
log "Building images (this generates the Prisma client for DATABASE_PROVIDER=$(get_env_var DATABASE_PROVIDER))..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"}" build

# --- 4. Start the stack ---
log "Starting the stack (app [runs migrations, then api + web]${PROFILE_ARGS[*]:+ -> caddy})..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"}" up -d

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
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"}" ps

if [ -n "${PROFILE_ARGS[*]:-}" ]; then
  DOMAIN_VAL="$(get_env_var DOMAIN)"
  log "Visit http://${DOMAIN_VAL:-localhost} (https:// automatically if DOMAIN is a real domain with DNS pointed here)."
else
  WEB_PORT_VAL="$(get_env_var WEB_HOST_BIND_PORT)"
  API_PORT_VAL="$(get_env_var API_HOST_BIND_PORT)"
  log "web is listening on 127.0.0.1:${WEB_PORT_VAL:-3000}, api on 127.0.0.1:${API_PORT_VAL:-4000} (/webhooks/* only)."
  log "Point your existing reverse proxy at those -- see 'Running alongside an existing site' in DEPLOY.md."
fi

# --- 5. First platform admin ---
# Always offered when interactive (not just on a brand-new env file) -- if
# you already have an admin account, just answer no.
CREATE_ADMIN_CMD='docker compose -f '"$COMPOSE_FILE"' exec app pnpm --filter @sitetrack/database db:create-admin <email> "<password>" "<name>"'
if [ "$INTERACTIVE" -eq 1 ]; then
  echo
  read -r -p "[deploy] Create your first platform admin now? [Y/n]: " CREATE_NOW || true
  CREATE_NOW_LC="$(printf '%s' "${CREATE_NOW:-}" | tr '[:upper:]' '[:lower:]')"
  if [ -z "$CREATE_NOW_LC" ] || [ "$CREATE_NOW_LC" = "y" ] || [ "$CREATE_NOW_LC" = "yes" ]; then
    read -r -p "  Admin email: " ADMIN_EMAIL || true
    read -r -p "  Admin name: " ADMIN_NAME || true
    while true; do
      read -r -s -p "  Admin password (min 8 chars): " ADMIN_PASSWORD || true
      echo
      read -r -s -p "  Confirm password: " ADMIN_PASSWORD_CONFIRM || true
      echo
      if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
        echo "  Passwords didn't match -- try again."
        continue
      fi
      if [ "${#ADMIN_PASSWORD}" -lt 8 ]; then
        echo "  Password must be at least 8 characters -- try again."
        continue
      fi
      break
    done
    if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_NAME" ]; then
      log "Creating platform admin $ADMIN_EMAIL..."
      docker compose -f "$COMPOSE_FILE" exec app \
        pnpm --filter @sitetrack/database db:create-admin "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "$ADMIN_NAME"
      log "Admin created. Log in at /admin/login."
    else
      log "Skipped (email/name required). Create one later with:"
      log "  $CREATE_ADMIN_CMD"
    fi
  else
    log "Skipped. Create one later with:"
    log "  $CREATE_ADMIN_CMD"
  fi
else
  log "Create your first platform admin with (the admin panel has its own"
  log "separate login and can't be reached via normal signup):"
  log "  $CREATE_ADMIN_CMD"
fi

log "Logs:   docker compose -f $COMPOSE_FILE logs -f"
log "Update: ./scripts/update.sh"
