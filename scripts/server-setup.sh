#!/usr/bin/env bash
# ============================================================
# One-time server bootstrap — Ubuntu 22.04+
# Usage: sudo bash scripts/server-setup.sh
# ============================================================
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root (sudo)"; exit 1
fi

APP_DIR="/opt/bizzo"
APP_USER="bizzo"

echo "[setup] Updating packages"
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git ufw fail2ban ca-certificates gnupg lsb-release

echo "[setup] Installing Docker"
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

echo "[setup] Creating app user"
id -u "$APP_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$APP_USER"
usermod -aG docker "$APP_USER"

echo "[setup] Preparing directories"
mkdir -p "$APP_DIR"/{backups,certbot/conf,certbot/www}
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

echo "[setup] UFW firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "[setup] fail2ban"
systemctl enable --now fail2ban

echo "[setup] Daily backup cron (02:30)"
CRON_LINE="30 2 * * * cd $APP_DIR && docker compose -f docker-compose.prod.yml exec -T backup /backup.sh >> /var/log/bizzo-backup.log 2>&1"
( crontab -u "$APP_USER" -l 2>/dev/null | grep -v "backup.sh" ; echo "$CRON_LINE" ) | crontab -u "$APP_USER" -

echo "[setup] Done. Clone repo into $APP_DIR as $APP_USER"
