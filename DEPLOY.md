# Deploying SiteTrack

Docker-based deployment that works on any Linux server (a $5-6/mo VPS is
plenty to start: DigitalOcean, Hetzner, Linode, an AWS/GCP/Azure VM, etc.).
The only host requirement is Docker -- no Node, pnpm, or database client
needs to be installed on the server itself.

## What gets deployed

| Service | Public? | Purpose |
|---------|---------|---------|
| `app`   | 127.0.0.1 only | One container running both the Next.js app (port 3000) and the NestJS API (port 4000) -- see `Dockerfile`/`docker-entrypoint.sh` |
| `caddy` | opt-in, yes (80/443) | Automatic-HTTPS reverse proxy -- only starts with `--with-caddy` |

The Next.js side proxies every API call server-side, so the API's port
doesn't need to be public for the app to work -- the one exception is
`/webhooks/*` (inbound payment gateway webhooks), which has no browser
session to proxy through, so it's reached directly on port 4000 instead.

By default nothing is published beyond `127.0.0.1` — you point your own
existing reverse proxy (nginx, Caddy, etc.) at `app`'s two ports, see
"Running alongside an existing site" below. No existing reverse proxy on
this server? Pass `--with-caddy` to `deploy.sh`/`update.sh` to use the
bundled Caddy service for automatic HTTPS instead (needs ports 80/443 free).

Uses SQLite by default — no separate database service, no setup. See "Using
Postgres or MySQL instead of SQLite" below if more than one person will be
using the app at the same time (SQLite has no real concurrent-write story).

## One-time server setup

1. **Get a server** with a public IP. If you're using the bundled Caddy
   (`--with-caddy`), point a DNS **A record** for your domain (e.g.
   `app.yourdomain.com`) at that IP first -- Caddy requests/renews the HTTPS
   cert automatically. If you already have an existing reverse proxy, skip
   this (it already owns your DNS/TLS).

2. **Install Docker Engine + the Compose plugin**:
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker "$USER"   # log out/in after this
   docker compose version            # sanity check
   ```

3. **Clone the repo**:
   ```bash
   git clone https://github.com/harshallakare/sitetrack.git
   cd sitetrack
   ```
   No manual `.env.production` editing needed — `deploy.sh` (next section)
   creates it and generates all secrets itself. Using Postgres/MySQL instead
   of the SQLite default? See that section below before your first deploy.

## First deploy

```bash
./scripts/deploy.sh                # app on 127.0.0.1, bring your own proxy
./scripts/deploy.sh --with-caddy   # also start the bundled Caddy
```

Run on a real terminal without any flags, it first asks how this will be
reached from the internet:
1. an existing reverse proxy already running directly on **this host**
   (nginx, Caddy, etc.) — the default, nothing further to answer here
2. an existing reverse proxy running in **its own Docker container**
   (Nginx Proxy Manager, a dockerized nginx/Caddy, etc.) — asks for that
   container's Docker network name (`docker network ls` to find it)
3. no reverse proxy yet — starts the bundled Caddy, and asks for your real
   domain for automatic HTTPS

(Passing `--with-caddy` or `--proxy-network` upfront skips this question —
useful when scripting a redeploy.) It then creates `.env.production` and
generates `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`/`JWT_ADMIN_SECRET`/
`ENCRYPTION_KEY` itself (never reused across each other — the admin panel's
whole security model depends on that separation), builds the single `app`
image, starts it (runs `prisma migrate deploy`, then both the API and the
Next.js app) → `caddy` if you picked/passed option 3, and prints where to
point your reverse proxy (or the URL to visit, if using Caddy).

At the end it offers to create your first platform admin right there
(email, name, password) — the admin panel has its own separate login and
can't be reached via normal signup. Say no (or run non-interactively, e.g.
in a script) and it prints the equivalent manual command instead:
```bash
docker compose -f docker-compose.prod.yml exec app \
  pnpm --filter @sitetrack/database db:create-admin admin@yourdomain.com "a-strong-password" "Your Name"
```
(no `--` before the arguments — pnpm passes it through literally instead of stripping it, which would create a broken account with `--` as the email)
Then log in at `/admin/login` on whatever domain you pointed at SiteTrack.

## Every deploy after that

```bash
./scripts/update.sh                # matches how you first deployed
./scripts/update.sh --with-caddy   # pass this too if deploy.sh used it
```

Pulls the latest `main`, rebuilds only the images that changed, and
recreates those containers. Database migrations run automatically on `app`
startup — no separate migration step needed, and it's a no-op if there's
nothing new to apply.

Options:
- `./scripts/update.sh --no-pull` — rebuild/redeploy from the current
  checkout without touching git (useful if you deployed a specific commit
  or tag by hand).
- `./scripts/update.sh --with-caddy` — keep the bundled Caddy service
  running too, if your first `deploy.sh` used `--with-caddy`.

The script refuses to `git pull` over uncommitted local changes on the
server — commit, stash, or discard them first.

## Setting up the paywall (Razorpay)

One site is free per organization; unlocking unlimited sites requires an
active Razorpay subscription. This is entirely admin-configured in-app, not
via environment variables:

1. Log in to `/admin/login`, go to **Payment Gateways**, and configure
   Razorpay: Key ID + Key Secret (from the Razorpay dashboard → Settings →
   API Keys), then mark it **Active**. Start with TEST mode keys.
2. In the Razorpay dashboard, add a webhook pointed at
   `https://<your-domain>/webhooks/razorpay`, subscribed to at least
   `subscription.activated`, `subscription.charged`, `subscription.pending`,
   `subscription.halted`, and `subscription.cancelled`. Razorpay shows you a
   webhook secret when you create it — paste that into the same admin
   Payment Gateways screen's **Webhook Secret** field.
3. That's it — a customer's **Billing** page now shows a real "Upgrade to
   Unlimited" button that opens Razorpay Checkout, and the webhook keeps
   their subscription status in sync (a failed renewal correctly drops them
   back to the Free plan's 1-site limit, not just at signup).

Switching a gateway from TEST to LIVE mode, or rotating keys, takes effect
immediately for new checkouts — no rebuild or restart needed (unlike
`DATABASE_PROVIDER`, gateway credentials are read from the database at
request time).

## Day-to-day operations

```bash
# Tail logs
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml logs -f app    # one service

# Status
docker compose -f docker-compose.prod.yml ps

# Shell into the container
docker compose -f docker-compose.prod.yml exec app sh

# Stop everything (data volumes survive)
docker compose -f docker-compose.prod.yml down

# Stop everything AND delete volumes (destroys the database + uploads --
# only for tearing down a throwaway environment)
docker compose -f docker-compose.prod.yml down -v
```

## Backups

With the default SQLite setup, the database file lives in the `sqlite_data`
Docker volume; uploaded attachments live in `api_uploads`. At minimum, back
up the database regularly.

**From the admin panel** (`/admin/database`, platform admin only): click
**Download Backup** to get an engine-native copy straight to your browser —
no server-side storage, nothing to clean up. **Restore** on the same page
uploads a previously-downloaded backup; it requires typing `RESTORE` to
confirm, validates the file's content actually matches the current engine
before touching anything, and automatically writes a safety snapshot of the
*current* state (to the `api_backups` volume) immediately before
overwriting it — so a bad restore is itself recoverable. This is genuinely
destructive: it replaces the **entire** database for every organization on
this deployment, not just one. Restart the app container after a restore
(`docker compose -f docker-compose.prod.yml restart app`) so it reconnects
cleanly.

**From the command line**, for SQLite you can just copy the file out of the
volume:
```bash
docker compose -f docker-compose.prod.yml cp app:/repo/packages/database/prisma/data/prod.db ./backup-$(date +%F).db
```
If you switched to Postgres, the equivalent is:
```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U sitetrack sitetrack > backup-$(date +%F).sql
```
Either way, copy the resulting file off the server (S3, another machine,
etc.) — a backup that lives only on the box it's protecting isn't a backup.

## Using Postgres or MySQL instead of SQLite

The schema is engine-portable (`packages/database/prisma/schema.template.prisma`).
SQLite is fine for a single small deployment but has no real concurrent-write
story — switch once more than one person is using the app at the same time.

1. Add a `postgres` (or your own MySQL) service back to `docker-compose.prod.yml`,
   e.g.:
   ```yaml
     postgres:
       image: postgres:16-alpine
       restart: unless-stopped
       environment:
         POSTGRES_DB: ${POSTGRES_DB:-sitetrack}
         POSTGRES_USER: ${POSTGRES_USER:-sitetrack}
         POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required in .env.production}
       volumes:
         - postgres_data:/var/lib/postgresql/data
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-sitetrack}"]
         interval: 5s
         timeout: 5s
         retries: 20
   ```
   and add `postgres_data:` under the top-level `volumes:`. Give `app` a
   `depends_on: { postgres: { condition: service_healthy } }` so it waits for
   Postgres to be ready. Prefer a managed database (RDS, Supabase, Neon,
   Azure Database for PostgreSQL, ...) instead? Skip the service block
   entirely and just point `DATABASE_URL` at it.
2. In `.env.production`, set `DATABASE_PROVIDER=postgresql` (or `mysql`) and
   the matching `DATABASE_URL`, e.g.
   `postgresql://sitetrack:<password>@postgres:5432/sitetrack`.
3. Rebuild and redeploy — the provider is baked into the `app` image at
   build time, not read at runtime:
   ```bash
   ./scripts/update.sh --no-pull
   ```

## Running alongside an existing site on the same server

This is the default — plain `./scripts/deploy.sh` (no `--with-caddy`) never
touches ports 80/443 at all; `app` only binds to `127.0.0.1`. If you already
have nginx, Apache, or a Caddy instance fronting other sites on this box,
just point it at SiteTrack:

1. Leave `DOMAIN=localhost` in `.env.production` — your existing proxy
   handles TLS for your real domain, not SiteTrack.

2. Point your existing proxy at `127.0.0.1:3000` (everything) and
   `127.0.0.1:4000` (for `/webhooks/*` only — inbound payment gateway
   webhooks have no browser session to proxy through, so they bypass the
   Next.js app and go straight to the API). For **nginx**:
   ```nginx
   server {
       listen 443 ssl;
       server_name app.yourdomain.com;
       # ... your existing ssl_certificate lines ...
       location /webhooks/ {
           proxy_pass http://127.0.0.1:4000;
           proxy_set_header Host $host;
       }
       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```
   For an existing **Caddy** instance, add a new site block:
   ```
   app.yourdomain.com {
       handle /webhooks/* {
           reverse_proxy 127.0.0.1:4000
       }
       handle {
           reverse_proxy 127.0.0.1:3000
       }
   }
   ```
3. Reload the existing proxy (`nginx -s reload` / `systemctl reload caddy`,
   as appropriate), then `./scripts/deploy.sh` (without `--with-caddy`) as usual.

Ports collide with something other than 80/443 (e.g. another app already on
3000 or 4000)? Override in `.env.production`:
```
WEB_HOST_BIND_PORT=3001
API_HOST_BIND_PORT=4001
```

### If your reverse proxy itself runs in a Docker container

The steps above assume your proxy runs directly on the host. If it's
containerized instead — Nginx Proxy Manager, a dockerized nginx/Caddy,
etc. — `127.0.0.1` inside *that* container means itself, not this host, so
it can never reach `app` at `127.0.0.1:3000`. You'll typically see this as
the proxy connecting successfully but returning something that isn't
SiteTrack (e.g. Nginx Proxy Manager's own status JSON) — that's it proxying
back to itself.

Instead, attach `app` to the same Docker network your proxy container is
already on:

1. Find that network: `docker network ls`, then confirm your proxy
   container is on it: `docker network inspect <name> --format '{{range
   .Containers}}{{.Name}} {{end}}'`.
2. Deploy with `--proxy-network` (works with both `deploy.sh` and
   `update.sh`):
   ```bash
   ./scripts/deploy.sh --proxy-network
   ```
   The first time, it asks for the network name and saves it as
   `PROXY_NETWORK_NAME` in `.env.production`. Every `update.sh` after that
   needs the same flag (`./scripts/update.sh --proxy-network`) to keep `app`
   attached — a plain `docker network connect` done by hand doesn't survive
   the container being recreated.
3. In your proxy manager, set the forward target to `app` (port `3000` for
   everything, `4000` for `/webhooks/*` only) instead of `127.0.0.1`. For
   Nginx Proxy Manager specifically: edit the proxy host, set **Forward
   Hostname/IP** to `app` and **Forward Port** to `3000` (add a second
   proxy host or custom location the same way for `4000`/`/webhooks/*` if
   you use payment gateway webhooks).

## Troubleshooting

- **`app` won't start / migrations fail**: `docker compose -f docker-compose.prod.yml logs app`.
  Most often a wrong `DATABASE_URL`.
- **Certificate not issuing** (only relevant with `--with-caddy`): Caddy
  needs port 80 and 443 reachable from the internet and `DOMAIN`'s DNS
  already pointed at this server *before* first start. Check
  `docker compose -f docker-compose.prod.yml --profile caddy logs caddy`.
- **`caddy` fails to start / "address already in use"**: something else on
  this server already owns port 80 or 443 — either don't pass `--with-caddy`
  and use "Running alongside an existing site" above instead, or override
  `CADDY_HTTP_BIND`/`CADDY_HTTPS_BIND` in `.env.production`.
- **Admin panel unreachable**: it's a separate route (`/admin/login`) and
  separate cookies from the customer app — confirm you're hitting the right
  path, and that you ran the `db:create-admin` step above.
- **Reverse proxy connects but shows something that isn't SiteTrack** (e.g.
  your proxy manager's own status page/API): your proxy is containerized
  and forwarding to `127.0.0.1`, which resolves to itself, not this host —
  see "If your reverse proxy itself runs in a Docker container" above.
