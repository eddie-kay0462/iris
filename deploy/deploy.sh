#!/usr/bin/env bash
#
# Deploy the current branch to this server.
#
#   cd /opt/iris && ./deploy/deploy.sh
#
# Replicas are replaced one at a time, each one waited on until it reports
# healthy before the next is touched, so Caddy always has at least two live
# upstreams and no request is dropped. This is the zero-downtime deploy Render
# used to do for us.
#
#   --no-pull    deploy the working tree as-is, without git pull
#   --recreate   also rebuild and restart the recommender (slower; only needed
#                when recommender/ actually changed)

set -euo pipefail

cd "$(dirname "$0")/.."
APP_DIR="$PWD"

API_SERVICES=(api1 api2 api3)
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-90}"

DO_PULL=1
DO_RECOMMENDER=0
for arg in "$@"; do
  case "$arg" in
    --no-pull)  DO_PULL=0 ;;
    --recreate) DO_RECOMMENDER=1 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

STEP="starting"
log()  { STEP="$*"; printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m    %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

[[ -f "$APP_DIR/.env" ]] || die "$APP_DIR/.env is missing. Copy deploy/env.production.example and fill it in."

# ---- Telegram notifications -------------------------------------------------
# Read two keys out of .env rather than sourcing it: .env is written for
# Compose, not bash, and a value with a space or a $ in it would break `source`.
env_get() {
  grep -E "^$1=" "$APP_DIR/.env" | tail -n1 | cut -d= -f2- | sed -E "s/^['\"]//; s/['\"]$//"
}
TG_TOKEN="$(env_get TELEGRAM_BOT_TOKEN || true)"
TG_CHAT="$(env_get TELEGRAM_CHAT_ID || true)"

# Best effort: a Telegram outage must never fail or slow a deploy.
notify() {
  [[ -n "$TG_TOKEN" && -n "$TG_CHAT" ]] || return 0
  curl -s -o /dev/null --max-time 5 \
    "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TG_CHAT}" \
    --data-urlencode "text=$1" || true
}

on_exit() {
  local code=$?
  (( code == 0 )) || notify "❌ Iris deploy FAILED during: ${STEP} (exit ${code}) on $(hostname)"
}
trap on_exit EXIT

# Wait for a compose service to report healthy via its container HEALTHCHECK.
wait_healthy() {
  local svc="$1" waited=0 cid state
  cid="$(docker compose ps -q "$svc")"
  [[ -n "$cid" ]] || die "$svc has no container"

  while (( waited < HEALTH_TIMEOUT )); do
    state="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid")"
    case "$state" in
      healthy) printf '    %s healthy after %ss\n' "$svc" "$waited"; return 0 ;;
      none)    warn "$svc has no healthcheck defined — not waiting"; return 0 ;;
      unhealthy)
        docker compose logs --tail 40 "$svc"
        die "$svc went unhealthy"
        ;;
    esac
    sleep 2
    waited=$(( waited + 2 ))
  done

  docker compose logs --tail 40 "$svc"
  die "$svc did not become healthy within ${HEALTH_TIMEOUT}s"
}

if (( DO_PULL )); then
  log "Pulling latest code"
  git pull --ff-only
fi

REV="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
notify "🚀 Iris deploy started — ${BRANCH} @ ${REV}: $(git log -1 --pretty=%s 2>/dev/null | cut -c1-120)"

# api1..api3 and worker all share one build context and one image tag
# (iris-backend:local), so building a single service builds the image the rest
# will run. Building all four would repeat identical work.
log "Building backend image"
docker compose build api1

# Small and cached; rebuilding every time means a change to the alerter can
# never be silently left behind.
log "Building log-alerts image"
docker compose build log-alerts

if (( DO_RECOMMENDER )); then
  log "Building recommender image"
  docker compose build recommender
fi

if (( DO_RECOMMENDER )); then
  log "Restarting recommender"
  docker compose up -d recommender
  wait_healthy recommender
fi

# Bring up anything not yet running (first deploy, or a new service) without
# disturbing the replicas we're about to roll individually.
log "Ensuring supporting services are up"
docker compose up -d --no-recreate recommender caddy docker-proxy
# Up before the replicas roll, so it's watching — and so it can tell the
# deliberate restarts below apart from crashes. Recreated only if its image or
# config changed.
docker compose up -d log-alerts

# The worker is not in the load-balancer pool, so it can be replaced outright.
log "Restarting worker (owns the schedulers)"
docker compose up -d --force-recreate worker
wait_healthy worker

for svc in "${API_SERVICES[@]}"; do
  log "Rolling $svc"
  docker compose up -d --force-recreate "$svc"
  wait_healthy "$svc"
  # Caddy's active health check runs every 10s; give it a beat to put this node
  # back in rotation before we take the next one out.
  sleep 10
done

log "Reloading Caddy"
docker compose up -d caddy

log "Pruning dangling images"
docker image prune -f >/dev/null

log "Status"
docker compose ps

notify "✅ Iris deploy complete — ${BRANCH} @ ${REV}"

cat <<'DONE'

Deploy complete.

  Logs (all):        docker compose logs -f
  Logs (one node):   docker compose logs -f api2
  Scheduler check:   docker compose logs worker | grep -i schedul
DONE
