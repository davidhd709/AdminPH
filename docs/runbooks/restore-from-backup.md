# Runbook — Restore de la BD desde backup

## Contexto

Los backups los genera `infra/scripts/backup-db.sh` (cron diario, formato
custom `-Fc`, retención 7 días local + opcional R2). Archivos en
`/var/backups/adminph/adminph_adminph_db_YYYYMMDD_HHMMSS.dump`.

## Restore

> ⚠️ Esto SOBREESCRIBE la BD actual. Hacer un backup del estado actual antes.

```bash
# 1. Backup defensivo del estado actual.
/opt/adminph/infra/scripts/backup-db.sh

# 2. (Opcional) bajar la app para evitar escrituras durante el restore.
docker compose -f docker-compose.prod.yml stop backend

# 3. Restaurar el dump elegido.
#    Desde el host con psql/pg_restore apuntando al contenedor de Postgres:
docker exec -i adminph_postgres_prod pg_restore \
  --clean --if-exists --no-owner \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" < /var/backups/adminph/<archivo>.dump

# 4. Levantar la app.
docker compose -f docker-compose.prod.yml --env-file .env.production up -d backend

# 5. Verificar.
curl -fsS https://api.adminph.example/health
```

## Prueba periódica (obligatoria)

Restaurar un backup en una BD desechable al menos 1 vez al mes para validar
que los dumps son recuperables. Un backup no probado no es un backup.

```bash
# BD temporal de prueba
docker run --rm -d --name pg_restore_test -e POSTGRES_PASSWORD=test -p 5999:5432 postgres:16
sleep 5
docker exec -i pg_restore_test createdb -U postgres adminph_test
docker exec -i pg_restore_test pg_restore --no-owner -U postgres -d adminph_test < <archivo>.dump
docker exec pg_restore_test psql -U postgres -d adminph_test -c '\dt'  # debe listar las tablas
docker rm -f pg_restore_test
```
