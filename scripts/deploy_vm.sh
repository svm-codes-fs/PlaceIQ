#!/usr/bin/env bash
# One-command deployment of PlaceIQ on a fresh Ubuntu 22.04/24.04 server.
#
#   curl -fsSL https://raw.githubusercontent.com/svm-codes-fs/Placement-management-system/main/scripts/deploy_vm.sh | sudo bash
#   curl -fsSL .../deploy_vm.sh | sudo bash -s -- placeiq.example.com     # with your own domain
#
# Installs Docker and Caddy, clones the repo to /opt/placeiq, generates secrets
# in /opt/placeiq/.env (kept on re-runs), starts docker-compose.prod.yml and
# puts Caddy in front with automatic HTTPS. Without a domain it uses
# <your-ip>.sslip.io. Re-run the same command to update to the latest code.
set -euo pipefail

DOMAIN="${1:-}"
REPO="https://github.com/svm-codes-fs/Placement-management-system.git"
DIR=/opt/placeiq

if [ "$(id -u)" -ne 0 ]; then echo "Please run with sudo."; exit 1; fi

IP="$(curl -fsS https://api.ipify.org)"
if [ -z "$DOMAIN" ]; then DOMAIN="${IP//./-}.sslip.io"; fi
echo "==> Deploying PlaceIQ to https://$DOMAIN"

# Swap helps small servers build images and load the embedding model
if [ ! -f /swapfile ] && [ "$(free -m | awk '/Mem:/{print $2}')" -lt 3000 ]; then
  echo "==> Adding 2 GB swap"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

if ! command -v docker >/dev/null; then
  echo "==> Installing Docker"
  curl -fsSL https://get.docker.com | sh
fi

if ! command -v caddy >/dev/null; then
  echo "==> Installing Caddy (HTTPS)"
  apt-get update -q
  apt-get install -y -q debian-keyring debian-archive-keyring apt-transport-https gnupg git openssl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q
  apt-get install -y -q caddy
fi

if [ -d "$DIR/.git" ]; then
  echo "==> Updating code"
  git -C "$DIR" pull --ff-only
else
  echo "==> Cloning code"
  git clone "$REPO" "$DIR"
fi
cd "$DIR"

if [ ! -f .env ]; then
  echo "==> Generating secrets in $DIR/.env"
  DEMO_PASSWORD="$(openssl rand -base64 12 | tr -d '/+=')"
  cat > .env <<EOF
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -hex 32)
POSTGRES_USER=placeiq
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_DB=placeiq
CORS_ORIGINS=https://$DOMAIN
FRONTEND_URL=https://$DOMAIN
# nginx listens only on localhost; Caddy terminates HTTPS in front of it
WEB_BIND=127.0.0.1
WEB_PORT=8080
# Demo colleges and accounts (all use SEED_PASSWORD). Set to false for a clean install.
SEED_DEMO=true
SEED_PASSWORD=$DEMO_PASSWORD
# Optional: Claude for resume parsing and interview scoring
# ANTHROPIC_API_KEY=
EOF
  chmod 600 .env
fi

echo "==> Building and starting the stack (first build takes a few minutes)"
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Configuring HTTPS for $DOMAIN"
cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
    encode gzip
    reverse_proxy 127.0.0.1:8080
}
EOF
systemctl reload caddy || systemctl restart caddy

if command -v ufw >/dev/null && ufw status | grep -q active; then
  ufw allow 80/tcp && ufw allow 443/tcp
fi

echo "==> Waiting for the API"
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8080/api/health >/dev/null 2>&1; then break; fi
  sleep 5
done

echo
echo "PlaceIQ is running:  https://$DOMAIN"
echo "Demo password (all demo accounts, e.g. tiet_admin, aarav_tiet, superadmin):  $(grep '^SEED_PASSWORD=' .env | cut -d= -f2)"
echo "Settings: $DIR/.env   Logs: cd $DIR && docker compose -f docker-compose.prod.yml logs -f"
