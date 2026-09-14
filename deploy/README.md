# Deploying the Iris backend on Contabo

The API and the recommender run on a single Contabo VPS under Docker Compose,
behind Caddy. This replaces the two Render services. The public hostname does
not change: `iris-api.1nri.store` still serves the API, only the DNS record
behind it moves.

```
                    iris-api.1nri.store
                            │  :443
                    ┌───────▼────────┐
                    │     caddy      │  TLS + load balancer
                    └───────┬────────┘
              ┌─────────────┼─────────────┐
         ┌────▼───┐    ┌────▼───┐    ┌────▼───┐
         │  api1  │    │  api2  │    │  api3  │   schedulers OFF
         └────┬───┘    └────┬───┘    └────┬───┘
              └─────────────┼─────────────┘
                    ┌───────▼────────┐    ┌──────────────┐
                    │  recommender   │    │    worker    │  schedulers ON,
                    └────────────────┘    └──────────────┘  not load-balanced
```

## The server

**Contabo Cloud VPS 4** — 4 vCPU, 8 GB RAM, 100 GB SSD, unlimited traffic.

| Setting | Choice | Why |
|---|---|---|
| Term | 1 month, $6.60/mo | Prove it before committing. 12 months saves 15% — revisit once it's been stable a few weeks. |
| Region | European Union (free) | 131 ms from Ghana. UK is 126 ms for $1.30/mo; 5 ms isn't worth a recurring line item. |
| Storage | 100 GB SSD (free) | Images live in Supabase; the box holds Docker images, logs and a git checkout. |
| Image | Ubuntu 24.04 LTS | Long support window, cleanest Docker packaging. |
| Data protection | Auto Backup, $2.00/mo | Daily snapshots, 1-click restore. Cheapest insurance available on a self-managed box. |
| Private networking / object storage / monitoring | None | Single server; Supabase covers storage; logs cover monitoring. |

**~$8.60/mo.** At checkout, confirm the order summary lists only the VPS and Auto
Backup — the configurator can carry add-ons over from the URL fragment.

## First-time setup

**1. Provision.** Order the VPS, set a strong root password, then add your SSH
public key in the Contabo control panel.

**2. Bootstrap.** Copy `deploy/bootstrap.sh` to the server and run it as root:

```bash
scp deploy/bootstrap.sh root@<vps-ip>:
ssh root@<vps-ip>
DEPLOY_USER=iris \
SSH_PUBKEY="$(cat ~/.ssh/id_ed25519.pub)" \
REPO_URL=git@github.com:<owner>/<repo>.git \
REPO_BRANCH=main \
  bash bootstrap.sh
```

This updates the box, creates the `iris` user, installs your key, **disables root
and password SSH login**, sets up ufw + fail2ban, installs Docker with log
rotation, adds a 4 GB swapfile, and clones the repo to `/opt/iris`.

> Before you close that root session, open a second terminal and confirm
> `ssh iris@<vps-ip>` works. Password login is off; if the key didn't take, the
> only way back in is a Contabo reinstall.

**3. Secrets.**

```bash
ssh iris@<vps-ip>
nano /opt/iris/.env      # from deploy/env.production.example
chmod 600 /opt/iris/.env
```

Copy the values straight out of the Render service's Environment tab. Keep
`JWT_SECRET` identical to what's live — changing it signs every user out.

**4. First deploy.**

```bash
cd /opt/iris
SITE_ADDRESS=":80" ./deploy/deploy.sh
```

Start on plain HTTP so Caddy doesn't try to get a certificate for a hostname
that still points at Render. Verify before touching DNS:

```bash
curl -H 'Host: iris-api.1nri.store' http://<vps-ip>/api/health
# {"status":"ok","instance":"api1","crons":false,"uptime":12}

curl --max-time 5 http://<vps-ip>:4000/api/health   # MUST fail — only Caddy is exposed
```

Check that exactly one container owns the schedulers:

```bash
docker compose logs worker | grep -i schedul   # "Schedulers enabled"
docker compose logs api1   | grep -i schedul   # "Schedulers disabled ... unregistered 5 cron job(s)"
```

Confirm requests are actually spread across all three replicas — this is the
first place the load balancer runs for real, so don't skip it:

```bash
for i in $(seq 1 12); do
  curl -s -H 'Host: iris-api.1nri.store' http://<vps-ip>/api/health
  echo
done | grep -o '"instance":"[a-z0-9]*"' | sort | uniq -c
#    4 "instance":"api1"
#    4 "instance":"api2"
#    4 "instance":"api3"     <- roughly even; "worker" must NOT appear
```

Then confirm a dead replica is invisible:

```bash
docker compose stop api2
sleep 12                     # Caddy health-checks every 10s
for i in $(seq 1 8); do curl -sf -H 'Host: iris-api.1nri.store' \
  http://<vps-ip>/api/health >/dev/null && echo ok; done   # expect 8x ok
docker compose start api2
```

Point a local admin build at `http://<vps-ip>` and exercise login, orders,
products and an analytics report.

## Cutover

The domain doesn't move. Only the record behind it changes.

1. In **Cloudflare DNS** for `1nri.store`, drop the TTL on the `iris-api` record
   to 60 s. Wait out the old TTL.
2. Delete the `iris-api` **CNAME → `iris-backend-fea7.onrender.com`** and create
   an **A record → `<vps-ip>`**.
3. Leave it **DNS-only (grey cloud)**. Caddy has to answer the ACME challenge on
   the real origin to get a certificate; behind Cloudflare's proxy it can't.
4. On the server, restart Caddy on the real hostname so it requests the cert:
   ```bash
   cd /opt/iris && docker compose up -d --force-recreate caddy
   docker compose logs -f caddy      # watch for "certificate obtained successfully"
   ```
   (`SITE_ADDRESS` defaults to `iris-api.1nri.store`, so drop the override.)
5. `curl https://iris-api.1nri.store/api/health`
6. Smoke-test the storefront and admin, **including a real Paystack payment** so
   the webhook round-trips (`POST /api/payments/webhooks/paystack`).
7. Within 10 minutes, confirm a reconciliation tick in `docker compose logs
   worker` — and in no other container.
8. **Suspend** the Render services. Don't delete them for a week.
9. Put the TTL back up.

### Rollback

Change the DNS record back to a CNAME → `iris-backend-fea7.onrender.com` and
resume the Render service. That's the whole rollback, and it's why Render stays
suspended rather than deleted.

## Everyday operations

```bash
cd /opt/iris

./deploy/deploy.sh              # pull, build, rolling restart, zero downtime
./deploy/deploy.sh --recreate   # also rebuild the recommender (slower)
./deploy/deploy.sh --no-pull    # deploy the working tree as-is

docker compose ps               # what's up, and is it healthy
docker compose logs -f          # everything, prefixed by container
docker compose logs -f api2     # one replica
docker compose logs -f caddy    # TLS, and which upstream served what
docker stats                    # RAM/CPU headroom
```

### Reading the logs

This is the Render-parity part. Every backend line is JSON with an ISO
timestamp, level, context and message:

- **one line per request** — method, path, status, duration
  (`src/common/interceptors/logging.interceptor.ts`)
- **every exception**, including 400/401/403/404 that Nest's default filter
  drops silently, with the user id attached
  (`src/common/filters/all-exceptions.filter.ts`)

Because there are three replicas, always note *which* container a line came
from. `docker compose logs` prefixes each line with the service name, and each
health response carries its own `instance`.

Useful filters:

```bash
# errors only, across every replica, last hour
docker compose logs --since 1h | grep '"level":"error"'

# one order across whatever replica handled it
docker compose logs --since 24h | grep 'ORD-12345'

# which upstream Caddy picked, and how long it took
docker compose logs caddy | jq -r '[.ts, .request.uri, .upstream, .duration] | @tsv'

# scheduler activity (worker only)
docker compose logs worker | grep -i reconcil
```

Logs rotate at 20 MB × 10 files per container, set in both `docker-compose.yml`
and `/etc/docker/daemon.json`.

## Notes and known edges

**Before this branch merges to `main`, while Render is still live.** The
scheduler gate is opt-in: `RUN_CRONS !== 'true'` disables it. Render sets no
such variable, so the first deploy of this code to Render would silently stop
all five reconciliation crons — Paystack recovery, abandoned checkout, pop-up
pickup reminders — on a backend still serving customers. Either be fully cut
over to Contabo before merging, or set `RUN_CRONS=true` in the Render service's
Environment tab first. Nothing warns you: the API keeps answering normally and
the crons simply never fire.

**Rate limits are per-replica.** `ThrottlerModule` keeps its counters in memory,
so the 60/30/30-per-minute limits on the public analytics ingest routes are
effectively 3× looser across the pool. Fine for abuse prevention. If it ever
needs to be exact, add Redis and `@nest-lab/throttler-storage-redis`.

**`trust proxy` is now set** (`src/main.ts`). Without it, Express reads the
socket address — always Caddy's — and every visitor would share one rate-limit
bucket. Worth knowing this was already the case on Render, which also fronts the
app with a proxy; the migration fixes it rather than introducing it.

**Adding a fourth replica** means two edits: a new `api4` service in
`docker-compose.yml` (copy `api3`, change `INSTANCE_ID`) and adding `api4:4000`
to the `reverse_proxy` line in the `Caddyfile`. Named services rather than
`deploy: replicas:` is deliberate — Caddy only active-health-checks static
upstreams, and against a replica set it resolves the service name once and pins
one container.

**Only Caddy publishes ports.** Docker writes its own iptables rules, so a
`ports:` entry on any other service is reachable from the internet regardless of
what ufw says. Treat adding one as opening a firewall hole.

**The recommender's `/retrain` route doesn't work in the container** and never
did — the image excludes `scripts/` and `data/raw/`. Retraining is a local job;
commit the regenerated artifacts under `recommender/data/processed/` and deploy.
Nothing calls the route.

**Cloudflare's proxy (orange cloud) is off**, deliberately. Turning it on later
means switching Caddy to a DNS-01 challenge or a Cloudflare Origin certificate,
and adding `trusted_proxies` for Cloudflare's ranges so client IPs stay real.

## Later: CI/CD

Build-on-server is what's wired up today, and it's fine at this size — a build
costs ~2 minutes of VPS CPU. When that starts to chafe, the path is:

1. A GitHub Actions workflow builds `apps/backend` and `recommender` on push to
   `main` and pushes to GHCR as `ghcr.io/<owner>/iris-backend:<sha>`.
2. Swap the `build:` blocks in `docker-compose.yml` for `image:` referencing
   those tags — the `image:` keys are already named for this.
3. `deploy.sh` drops the build step and runs `docker compose pull` instead; the
   rolling-restart logic stays exactly as-is.

That buys immutable artifacts, rollback to any tag, and no build load on the
box, at the cost of a GHCR token and an SSH deploy key in GitHub secrets.
