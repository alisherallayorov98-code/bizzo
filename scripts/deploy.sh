#!/usr/bin/env bash
# ============================================================
# Production deploy — pull, build, migrate, zero-downtime restart
# Usage: bash scripts/deploy.sh
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"

log() { echo "[deploy] $*"; }

rollback() {
  log "ERROR — rolling back"
  git reset --hard HEAD@{1} || true
  $COMPOSE up -d
  exit 1
}
trap rollback ERR

log "1/6 Pulling latest code"
git fetch origin
git reset --hard origin/main

log "2/6 Taking pre-deploy backup"
$COMPOSE exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl' \
  | gzip -9 > "backups/pre-deploy-$(date +%Y%m%d_%H%M%S).sql.gz"

log "3/6 Building images"
$COMPOSE build --pull backend frontend

log "4/6 Running migrations"
$COMPOSE run --rm backend npx prisma migrate deploy

log "5/6 Rolling restart (backend then frontend)"
$COMPOSE up -d --no-deps --build backend
sleep 10
$COMPOSE up -d --no-deps --build frontend
$COMPOSE up -d nginx

log "6/6 Health check"
sleep 5
for i in 1 2 3 4 5; do
  if curl -fsS http://localhost/health >/dev/null; then
    log "Health OK"
    break
  fi
  log "Waiting for health ($i/5)"
  sleep 5
  [ "$i" = "5" ] && rollback
done

log "Deploy complete"
trap - ERR
