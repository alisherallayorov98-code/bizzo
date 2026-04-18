#!/usr/bin/env sh
# ============================================================
# BIZZO PostgreSQL backup → local + S3/MinIO + rotation + alert
# ============================================================
# Env talablari:
#   DB_HOST (default: postgres), DB_USER, DB_NAME, PGPASSWORD
#   BACKUP_DIR (default: /backups)
#   BACKUP_RETENTION_DAYS (default: 30)
#   BACKUP_S3_BUCKET, BACKUP_S3_ENDPOINT (MinIO uchun), BACKUP_S3_REGION
#   BACKUP_S3_ACCESS_KEY, BACKUP_S3_SECRET_KEY
#   TELEGRAM_ALERT_BOT_TOKEN, TELEGRAM_ALERT_CHAT_ID (ixtiyoriy)
# ============================================================
set -eu

DB_HOST="${DB_HOST:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILE="${BACKUP_DIR}/bizzo_${TIMESTAMP}.sql.gz"

alert() {
  [ -z "${TELEGRAM_ALERT_BOT_TOKEN:-}" ] && return 0
  [ -z "${TELEGRAM_ALERT_CHAT_ID:-}" ]    && return 0
  curl -s -X POST \
    "https://api.telegram.org/bot${TELEGRAM_ALERT_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_ALERT_CHAT_ID}" \
    -d "text=$1" > /dev/null || true
}

on_error() {
  echo "[backup] FAILED"
  alert "🚨 BIZZO backup FAILED at $(date -u +%FT%TZ)"
  exit 1
}
trap on_error ERR

mkdir -p "${BACKUP_DIR}"

echo "[backup] Dump → ${FILE}"
pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" --no-owner --no-acl \
  | gzip -9 > "${FILE}"

SIZE=$(du -h "${FILE}" | cut -f1)
echo "[backup] Done local: ${FILE} (${SIZE})"

# ---------- S3 / MinIO upload ----------
if [ -n "${BACKUP_S3_BUCKET:-}" ] && [ -n "${BACKUP_S3_ACCESS_KEY:-}" ]; then
  echo "[backup] Uploading to s3://${BACKUP_S3_BUCKET}/"
  export AWS_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY}"
  export AWS_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_KEY}"
  export AWS_DEFAULT_REGION="${BACKUP_S3_REGION:-us-east-1}"

  ENDPOINT_FLAG=""
  if [ -n "${BACKUP_S3_ENDPOINT:-}" ]; then
    ENDPOINT_FLAG="--endpoint-url ${BACKUP_S3_ENDPOINT}"
  fi

  aws ${ENDPOINT_FLAG} s3 cp "${FILE}" \
    "s3://${BACKUP_S3_BUCKET}/daily/bizzo_${TIMESTAMP}.sql.gz"
  echo "[backup] S3 upload OK"
fi

# ---------- Rotation ----------
find "${BACKUP_DIR}" -name "bizzo_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -delete || true
echo "[backup] Rotation: >${RETENTION_DAYS} days purged"

alert "✅ BIZZO backup OK: ${FILE} (${SIZE})"
echo "[backup] Success"
