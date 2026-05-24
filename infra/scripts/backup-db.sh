#!/usr/bin/env bash
#
# Backup de la BD PostgreSQL de AdminPH.
# - Dump comprimido con pg_dump (formato custom -Fc, restaurable con pg_restore).
# - Retención local configurable (default 7 días).
# - Opcional: subida a almacenamiento S3-compatible (R2/MinIO) si hay rclone.
#
# Uso (cron diario):
#   0 3 * * *  /opt/adminph/infra/scripts/backup-db.sh >> /var/log/adminph-backup.log 2>&1
#
# Variables (exportar o poner en /opt/adminph/.env.backup):
#   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
#   BACKUP_DIR           (default /var/backups/adminph)
#   RETENTION_DAYS       (default 7)
#   RCLONE_REMOTE        (opcional, ej. "r2:adminph-backups")

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/adminph}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
PGDATABASE="${PGDATABASE:-adminph_db}"
TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"
OUTFILE="${BACKUP_DIR}/adminph_${PGDATABASE}_${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

echo "[$(date -u)] Iniciando backup de ${PGDATABASE} -> ${OUTFILE}"
pg_dump -Fc -f "$OUTFILE" "$PGDATABASE"
echo "[$(date -u)] Backup completado: $(du -h "$OUTFILE" | cut -f1)"

# Subida opcional a almacenamiento remoto.
if [[ -n "${RCLONE_REMOTE:-}" ]] && command -v rclone >/dev/null 2>&1; then
  echo "[$(date -u)] Subiendo a ${RCLONE_REMOTE}"
  rclone copy "$OUTFILE" "$RCLONE_REMOTE"
fi

# Retención local: borra dumps más viejos que RETENTION_DAYS.
find "$BACKUP_DIR" -name "adminph_*.dump" -type f -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date -u)] Limpieza de backups > ${RETENTION_DAYS} días completada"

# Restore (referencia):
#   pg_restore --clean --if-exists -d "$PGDATABASE" "$OUTFILE"
