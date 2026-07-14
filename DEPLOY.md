# Deploying SiteTrack

Docker-based deployment that works on any Linux server (a $5-6/mo VPS is
plenty to start: DigitalOcean, Hetzner, Linode, an AWS/GCP/Azure VM, etc.).
The only host requirement is Docker -- no Node, pnpm, or Postgres client
needs to be installed on the server itself.

## What gets deployed

| Service    | Public? | Purpose |
|------------|---------|---------|
| `caddy`    | yes (80/443) | Reverse proxy, automatic HTTPS via Let's Encrypt |
| `web`      | no (internal) | Next.js app -- the only thing browsers ever talk to |
| `api`      | no (internal) | NestJS API -- reached only by `web`, over the Docker network |
| `postgres` | no (internal) | Database (swap for a managed Postgres if you prefer) |

`web` proxies every API call server-side, so `api` never needs a public
port -- one less thing exposed to the internet. The one exception is
`/webhooks/*`, which Caddy routes straight to `api` (see below) since
there's no browser session to proxy for an inbound gateway webhook.

## One-time server setup

1. **Get a server** with a public IP. Point a DNS **A record** for your
   domain (e.g. `app.yourdomain.com`) at that IP if you have one -- Caddy
   will request/renew HTTPS certs for it automatically. No domain yet? Skip
   this, use the server's IP, and leave `DOMAIN=localhost` in step 3 (plain
   HTTP only, fine for an initial smoke test).

2. **Install Docker Engine + the Compose plugin**:
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker "$USER"   # log out/in after this
   docker compose version            # sanity check
   ```

3. **Clone the repo and configure secrets**:
   ```bash
   git clone https://github.com/harshallakare/sitetrack.git
   cd sitetrack
   cp .env.production.example .env.production
   ```
   Edit `.env.production`:
   - `DOMAIN` — your real domain, or leave `localhost`
   - `POSTGRES_PASSWORD` / `DATABASE_URL` — pick a strong password, used in both
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ADMIN_SECRET`, `ENCRYPTION_KEY` —
     generate each with:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
     (`ENCRYPTION_KEY` needs exactly 64 hex characters — this command produces that.)
   - Never reuse a secret across `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` /
     `JWT_ADMIN_SECRET` — the admin panel's whole security model depends on
     the admin credential domain being unforgeable from a leaked tenant secret.

## First deploy

```bash
./scripts/deploy.sh
```

This builds the `api`/`web` images, starts `postgres` → `api` (which runs
`prisma migrate deploy` automatically on boot) → `web` → `caddy`, and prints
the URL to visit. It refuses to run if `.env.production` still has
placeholder `change-me` values.

Once it's up, create your first platform admin (the admin panel has its own
separate login and cannot be reached via normal signup):
```bash
docker compose -f docker-compose.prod.yml exec api \
  pnpm --filter @sitetrack/database db:create-admin admin@yourdomain.com "a-strong-password" "Your Name"
```
(no `--` before the arguments — pnpm passes it through literally instead of stripping it, which would create a broken account with `--` as the email)
Then log in at `https://<your-domain>/admin/login`.

## Every deploy after that

```bash
./scripts/update.sh
```

Pulls the latest `main`, rebuilds only the images that changed, and
recreates those containers. Database migrations run automatically on `api`
startup — no separate migration step needed, and it's a no-op if there's
nothing new to apply.

Options:
- `./scripts/update.sh --no-pull` — rebuild/redeploy from the current
  checkout without touching git (useful if you deployed a specific commit
  or tag by hand).

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
docker compose -f docker-compose.prod.yml logs -f api    # one service

# Status
docker compose -f docker-compose.prod.yml ps

# Shell into a container
docker compose -f docker-compose.prod.yml exec api sh

# Stop everything (data volumes survive)
docker compose -f docker-compose.prod.yml down

# Stop everything AND delete volumes (destroys the database + uploads --
# only for tearing down a throwaway environment)
docker compose -f docker-compose.prod.yml down -v
```

## Backups

The database lives in the `postgres_data` Docker volume; uploaded
attachments live in `api_uploads`. At minimum, back up the database
regularly.

**From the admin panel** (`/admin/database`, platform admin only): click
**Download Backup** to get an engine-native dump (`pg_dump --format=custom`
on Postgres) straight to your browser — no server-side storage, nothing to
clean up. **Restore** on the same page uploads a previously-downloaded
backup; it requires typing `RESTORE` to confirm, validates the file's
content actually matches the current engine before touching anything, and
automatically writes a safety snapshot of the *current* state (to the
`api_backups` volume) immediately before overwriting it — so a bad restore
is itself recoverable. This is genuinely destructive: it replaces the
**entire** database for every organization on this deployment, not just one.
Restart the api container after a restore (`docker compose -f
docker-compose.prod.yml restart api`) so it reconnects cleanly.

**From the command line**, the equivalent Postgres commands still work if
you'd rather not go through the UI:

```bash
# Dump
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U sitetrack sitetrack > backup-$(date +%F).sql

# Restore (into a fresh/empty database)
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U sitetrack sitetrack < backup-2026-07-14.sql
```
Either way, copy the resulting file off the server (S3, another machine,
etc.) — a backup that lives only on the box it's protecting isn't a backup.

## Using an external managed database instead of the bundled Postgres

Point `DATABASE_URL` in `.env.production` at your managed instance
(RDS, Supabase, Neon, Azure Database for PostgreSQL, ...), then remove the
`postgres` service block from `docker-compose.prod.yml` and drop the
`depends_on: postgres` line from `api`. Everything else is unchanged.

## Using MySQL or SQLite instead of Postgres

The schema is engine-portable (`packages/database/prisma/schema.template.prisma`).
Set `DATABASE_PROVIDER=mysql` or `DATABASE_PROVIDER=sqlite` and the matching
`DATABASE_URL` in `.env.production`, then rebuild the `api` image (the
provider is baked in at build time, not read at runtime):
```bash
docker compose -f docker-compose.prod.yml build api
docker compose -f docker-compose.prod.yml up -d api
```
SQLite is fine for a single small deployment but has no concurrent-write
story — not recommended once more than one person is using the app at once.
If you use it, mount a volume for the `.db` file so it survives container
recreation (add one under `packages/database/prisma/` in the compose file)
and drop the `postgres` service entirely.

## Troubleshooting

- **`api` won't start / migrations fail**: `docker compose -f docker-compose.prod.yml logs api`.
  Most often a wrong `DATABASE_URL` or `postgres` not yet healthy — the
  compose file already waits for Postgres's healthcheck before starting `api`.
- **Certificate not issuing**: Caddy needs port 80 and 443 reachable from the
  internet and `DOMAIN`'s DNS already pointed at this server *before* first
  start. Check `docker compose -f docker-compose.prod.yml logs caddy`.
- **Admin panel unreachable**: it's a separate route (`/admin/login`) and
  separate cookies from the customer app — confirm you're hitting the right
  path, and that you ran the `db:create-admin` step above.
