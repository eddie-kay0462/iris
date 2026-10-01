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

## Telegram alerts

`log-alerts` (`deploy/telegram-alerts/`) follows every container's logs and
pushes what matters to a private Telegram chat. It does **not** forward every
line — one line per request would blow through Telegram's ~1 message/second
limit in minutes — it sends:

| What | When |
|---|---|
| 🔥 **Errors** | any 5xx, any non-HTTP `error` line (cron failures, Supabase errors), Caddy 502/503/504, Caddy TLS errors, recommender tracebacks. 4xx are counted for the digest, never alerted. |
| 🔁 **Repeats** | the same error (grouped across replicas, users and ids) alerts once, then at most one "×N more" line per 10 minutes while it keeps firing |
| 🔴 **Containers** | crash, OOM kill, failing health check — and ✅ when it recovers. Deploy restarts are recognised and stay silent. |
| 🌍 **Public reachability** | every minute the bot fetches `https://iris-api.1nri.store/api/health` over the internet, like a customer would. 3 failures in a row → 🔴 *API unreachable*; ✅ when it's back. Catches what container health can't: Caddy left on `:80`, an expired certificate, a firewall or DNS mistake. Can't be muted. |
| 🚀 **Deploys** | started / complete / ❌ failed, sent by `deploy.sh` |
| 📊 **Daily digest** | 21:00 Accra: requests per replica, 4xx/5xx, p50/p95 latency, slowest routes, top errors, container restarts, memory, scheduler state |

Messages are redacted before they leave the box (bearer tokens, JWTs, Paystack
keys, `token=`/`password=`/`secret=` values).

It reads Docker through `docker-proxy`, which allows only GET on containers and
events, and it talks to Telegram by long polling — so there's no host socket in
an app container and no new open port.

### Setup (once)

1. **Create the bot.** In Telegram, open **@BotFather** → `/newbot` → name it
   (e.g. "Iris Ops") and give it a username ending in `bot`. Copy the token it
   gives you (`123456789:AA…`). Treat it like a password.
2. **Find your chat id.** Open a chat with your new bot and send it anything.
   Then, from your laptop:
   ```bash
   curl -s "https://api.telegram.org/bot<TOKEN>/getUpdates" | grep -o '"chat":{"id":[0-9-]*'
   # "chat":{"id":123456789      <- that number
   ```
   If it comes back empty, send the bot another message and retry.
3. **Add both to the server's `.env`.**
   ```bash
   ssh iris@<vps-ip>
   nano /opt/iris/.env
   #   TELEGRAM_BOT_TOKEN=123456789:AA…
   #   TELEGRAM_CHAT_ID=123456789
   ls -l /opt/iris/.env     # still -rw------- ?
   ```
4. **Deploy.** `cd /opt/iris && ./deploy/deploy.sh`. You should get 🚀, then
   🟢 *Iris alerts online*, then ✅.
5. **Prove it works.**
   ```bash
   docker compose kill api2       # 🔴 api2 crashed … within seconds
   docker compose up -d api2      # 🔁 / ✅ once it's healthy
   ```
   `docker compose kill` sends a kill, which is normally read as deliberate —
   to simulate a real crash use `docker compose exec api2 kill 1` instead.
   Then send the bot `/status` and `/tail api1 10`.
6. **Cover the case the bot can't.** If the whole VPS goes down, the alerter
   goes with it. Add a free external monitor — UptimeRobot (it has a built-in
   Telegram integration) or Healthchecks.io — on
   `https://iris-api.1nri.store/api/health`, every 5 minutes.

### Commands

Only your `TELEGRAM_CHAT_ID` gets answers; anyone else who finds the bot is
ignored.

```
/status                 containers, health, uptime, last hour's requests/errors
/errors [30m|1h|6h|1d]  recent errors, grouped, most frequent first
/tail <service> [n]     last n lines (max 50): api1 api2 api3 worker recommender caddy
/digest                 today's digest so far
/mute [1h]              silence error alerts during maintenance (crashes still alert)
/unmute
```

### Operating it

```bash
docker compose logs -f log-alerts          # is it connected, what is it doing
docker compose up -d --build log-alerts    # pick up an edit to the alerter
pytest deploy/telegram-alerts              # rule tests, runs anywhere
```

Tuning lives in `.env`: `ALERT_DIGEST_HOUR` (default 21), `ALERT_DEDUP_SECONDS`
(default 600), `ALERT_PUBLIC_URL` (the URL probed for reachability; `off` to
disable). What counts as an alert lives in `deploy/telegram-alerts/rules.py`.

If `TELEGRAM_*` is missing the alerter logs a warning and idles rather than
crash-looping. To rotate the token: BotFather → `/revoke`, update `.env`,
`docker compose up -d log-alerts`.

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

**Never leave `SITE_ADDRESS` set after the first deploy.** `:80` is only for
testing before DNS points here. `deploy.sh` restarts Caddy at the end, so if
`SITE_ADDRESS=":80"` is still in your shell, your shell history or `.env`, the
next deploy quietly switches off HTTPS. Every container still reports healthy,
but the storefront can no longer reach the API. This happened once. Check with
`docker inspect iris-caddy --format '{{range .Config.Env}}{{println .}}{{end}}' | grep SITE`.

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
