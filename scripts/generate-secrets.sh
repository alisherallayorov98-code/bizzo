#!/usr/bin/env bash
# ============================================================
# Generate strong secrets for .env.production
# Usage: bash scripts/generate-secrets.sh
# ============================================================
set -euo pipefail

gen() { openssl rand -base64 48 | tr -d '\n=+/' | cut -c1-"$1"; }

echo "# Generated on $(date)"
echo "DB_PASSWORD=$(gen 32)"
echo "REDIS_PASSWORD=$(gen 32)"
echo "JWT_SECRET=$(gen 64)"
echo "JWT_REFRESH_SECRET=$(gen 64)"
echo "MINIO_ACCESS_KEY=$(gen 20)"
echo "MINIO_SECRET_KEY=$(gen 40)"
echo ""
echo "Copy these into your .env.production file."
