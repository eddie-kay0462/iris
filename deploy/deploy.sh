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

log()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m    %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

[[ -f "$APP_DIR/.env" ]] || die "$APP_DIR/.env is missing. Copy deploy/env.production.example and fill it in."

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

# api1..api3 and worker all share one build context and one image tag
# (iris-backend:local), so building a single service builds the image the rest
# will run. Building all four would repeat identical work.
log "Building backend image"
docker compose build api1

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
docker compose up -d --no-recreate recommender caddy

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

cat <<'DONE'

Deploy complete.

  Logs (all):        docker compose logs -f
  Logs (one node):   docker compose logs -f api2
  Scheduler check:   docker compose logs worker | grep -i schedul
DONE
