# BIZZO — Backup va Recovery

## Strategiya
- **Kunlik**: 03:00 da full dump (pg_dump + gzip)
- **S3/MinIO**: `bizzo-backups/daily/`
- **Retention**: 30 kun (`BACKUP_RETENTION_DAYS`)
- **Versioning**: bucket darajasida yoqilgan

## Env

```
DB_HOST=postgres
DB_USER=erp_user
DB_NAME=erp_platform
PGPASSWORD=...
BACKUP_DIR=/backups
BACKUP_RETENTION_DAYS=30
BACKUP_S3_BUCKET=bizzo-backups
BACKUP_S3_ENDPOINT=https://minio.bizzo.uz   # MinIO uchun
BACKUP_S3_REGION=us-east-1
BACKUP_S3_ACCESS_KEY=
BACKUP_S3_SECRET_KEY=
TELEGRAM_ALERT_BOT_TOKEN=
TELEGRAM_ALERT_CHAT_ID=
```

## Backup

```sh
./scripts/backup.sh
```

Natija: `/backups/bizzo_YYYYMMDD_HHMMSS.sql.gz` + `s3://bizzo-backups/daily/...`

### Cron (host yoki cronjob container)

```
0 3 * * * /app/scripts/backup.sh >> /var/log/bizzo-backup.log 2>&1
```

## Restore

Local fayldan:
```sh
./scripts/restore.sh /backups/bizzo_20260415_030000.sql.gz
```

S3 dan:
```sh
./scripts/restore.sh s3://bizzo-backups/daily/bizzo_20260415_030000.sql.gz
```

Interaktiv tasdiqlash `YES` kerak.

## MinIO bucket sozlash

```sh
mc mb minio/bizzo-backups
mc version enable minio/bizzo-backups
mc ilm add --expiry-days 30 minio/bizzo-backups
```

## Monitoring

- Muvaffaqiyat/xato → Telegram alert (cooldown 5 min)
- Hajm kamaygani alert: skriptga `du -b` solishtiruv qo'shiladi
- Oylik restore testi → staging DB ga

## File backups (MinIO user-uploads)
```sh
mc mirror --watch minio/erp-uploads backup-minio/erp-uploads
```

## Recovery testing (oylik)
1. Random backup tanlash
2. Staging DB ga `restore.sh`
3. `SELECT count(*) FROM ...` tekshirish
4. Natijani `docs/RECOVERY_TESTS.md` ga yozish
