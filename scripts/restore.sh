#!/usr/bin/env sh
# ============================================================
# BIZZO PostgreSQL restore (S3 yoki local backupdan)
# ============================================================
# Ishlatish:
#   ./restore.sh <backup-file.sql.gz>
#   ./restore.sh s3://bizzo-backups/daily/bizzo_20260415_030000.sql.gz
# ============================================================
set -eu

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup-file.sql.gz | s3://bucket/key>"
  exit 2
fi

SRC="$1"
DB_HOST="${DB_HOST:-postgres}"
TMP="/tmp/bizzo_restore_$$.sql.gz"

cleanup() { rm -f "$TMP" 2>/dev/null || true; }
trap cleanup EXIT

# ---------- Manbani olish ----------
case "$SRC" in
  s3://*)
    echo "[restore] Downloading: $SRC"
    export AWS_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY}"
    export AWS_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_KEY}"
    export AWS_DEFAULT_REGION="${BACKUP_S3_REGION:-us-east-1}"
    ENDPOINT_FLAG=""
    [ -n "${BACKUP_S3_ENDPOINT:-}" ] && ENDPOINT_FLAG="--endpoint-url ${BACKUP_S3_ENDPOINT}"
    aws ${ENDPOINT_FLAG} s3 cp "$SRC" "$TMP"
    FILE="$TMP"
    ;;
  *)
    [ -f "$SRC" ] || { echo "File topilmadi: $SRC"; exit 1; }
    FILE="$SRC"
    ;;
esac

echo "[restore] ⚠️  Bu operatsiya ${DB_NAME} bazasini QAYTA YARATADI"
echo "[restore] Davom etish uchun 'YES' yozing:"
read -r CONFIRM
[ "$CONFIRM" = "YES" ] || { echo "Bekor qilindi"; exit 0; }

echo "[restore] Drop + create..."
psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"${DB_NAME}\";"
psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"${DB_NAME}\";"

echo "[restore] Restoring..."
gunzip -c "$FILE" | psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME"

echo "[restore] ✅ Muvaffaqiyatli yakunlandi"

# ---------- Integrity check ----------
USERS=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM users;")
echo "[restore] Users: ${USERS}"
