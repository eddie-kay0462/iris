#!/usr/bin/env bash
#
# One-time setup for a fresh Contabo Cloud VPS 4 running Ubuntu 24.04.
#
# Run as root, straight after the server is provisioned:
#
#   ssh root@<vps-ip>
#   curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/main/deploy/bootstrap.sh -o bootstrap.sh
#   # (or just scp this file up)
#   DEPLOY_USER=iris SSH_PUBKEY="ssh-ed25519 AAAA... you@laptop" REPO_URL=git@github.com:<owner>/<repo>.git \
#     bash bootstrap.sh
#
# It is safe to re-run: every step checks before it acts.

set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-iris}"
APP_DIR="${APP_DIR:-/opt/iris}"
REPO_URL="${REPO_URL:-}"
REPO_BRANCH="${REPO_BRANCH:-main}"
SSH_PUBKEY="${SSH_PUBKEY:-}"
TIMEZONE="${TIMEZONE:-Africa/Accra}"
SWAP_GB="${SWAP_GB:-4}"

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Run this as root."
[[ -n "$SSH_PUBKEY" ]] || die "Set SSH_PUBKEY to your public key — this script disables password login, and locking yourself out of a fresh VPS means a reinstall."

# ---------------------------------------------------------------- system ----
log "Updating packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg git ufw fail2ban unattended-upgrades

log "Setting timezone to $TIMEZONE"
timedatectl set-timezone "$TIMEZONE"

# ------------------------------------------------------------------ swap ----
# 8 GB is comfortable at rest, but `npm ci` and a torch install running at the
# same time during a build can spike well past it. Swap turns an OOM-killed
# deploy into a merely slow one.
if [[ ! -f /swapfile ]]; then
  log "Creating ${SWAP_GB}G swapfile"
  fallocate -l "${SWAP_GB}G" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10
  grep -q '^vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
else
  log "Swapfile already present — skipping"
fi

# ------------------------------------------------------------------ user ----
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  log "Creating deploy user: $DEPLOY_USER"
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
  usermod -aG sudo "$DEPLOY_USER"
else
  log "User $DEPLOY_USER already exists"
fi

log "Installing SSH key for $DEPLOY_USER"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
touch "/home/$DEPLOY_USER/.ssh/authorized_keys"
grep -qxF "$SSH_PUBKEY" "/home/$DEPLOY_USER/.ssh/authorized_keys" \
  || echo "$SSH_PUBKEY" >> "/home/$DEPLOY_USER/.ssh/authorized_keys"
chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"

# ------------------------------------------------------------------- ssh ----
# Contabo hands over a root-with-password box, which is the single most-scanned
# thing on the internet. Keys only, no root login.
log "Hardening SSH"
cat > /etc/ssh/sshd_config.d/99-iris.conf <<'SSHCONF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
SSHCONF
sshd -t || die "sshd config test failed — NOT restarting sshd. Fix /etc/ssh/sshd_config.d/99-iris.conf first."
systemctl restart ssh

log "Enabling fail2ban"
systemctl enable --now fail2ban

# --------------------------------------------------------------- firewall ----
# Note: Docker inserts its own iptables rules and a container that publishes a
# port is reachable from the internet even when ufw says otherwise. That is
# exactly why docker-compose.yml publishes ports on Caddy alone — treat any new
# `ports:` entry as a hole in this firewall.
log "Configuring ufw (22, 80, 443)"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'ssh'
ufw allow 80/tcp comment 'http (acme + redirect)'
ufw allow 443/tcp comment 'https'
ufw allow 443/udp comment 'http/3'
ufw --force enable

# ---------------------------------------------------------------- docker ----
if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker Engine"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  log "Docker already installed — skipping"
fi

# Belt and braces: docker-compose.yml sets per-service rotation, this catches
# anything started outside it. Without a cap, container logs will eventually
# fill the 100 GB disk.
log "Setting Docker daemon log rotation"
cat > /etc/docker/daemon.json <<'DAEMONCONF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "20m", "max-file": "10" }
}
DAEMONCONF
systemctl enable docker
systemctl restart docker

usermod -aG docker "$DEPLOY_USER"

# ------------------------------------------------------------------- app ----
log "Preparing $APP_DIR"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR"

if [[ -n "$REPO_URL" && ! -d "$APP_DIR/.git" ]]; then
  log "Cloning $REPO_URL ($REPO_BRANCH)"
  sudo -u "$DEPLOY_USER" git clone --branch "$REPO_BRANCH" "$REPO_URL" "$APP_DIR"
elif [[ -z "$REPO_URL" ]]; then
  log "No REPO_URL given — clone into $APP_DIR yourself"
fi

if [[ ! -f "$APP_DIR/.env" ]]; then
  install -m 600 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /dev/null "$APP_DIR/.env"
  log "Created empty $APP_DIR/.env (chmod 600) — fill it from deploy/env.production.example"
fi

log "Enabling unattended security upgrades"
dpkg-reconfigure -f noninteractive unattended-upgrades

cat <<DONE

------------------------------------------------------------------
Bootstrap complete.

Next:
  1. Fill in secrets:      $APP_DIR/.env   (see deploy/env.production.example)
  2. Verify key login:     ssh $DEPLOY_USER@<vps-ip>     <-- do this BEFORE
                           closing this root session; password login is off.
  3. First deploy:         cd $APP_DIR && ./deploy/deploy.sh
  4. Then, and only then:  point DNS at this box (see deploy/README.md).
------------------------------------------------------------------
DONE
