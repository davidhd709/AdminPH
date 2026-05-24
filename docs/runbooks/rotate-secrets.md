# Runbook — Rotar secrets (JWT, DB password)

## Cuándo

- Antes del primer lanzamiento a producción (los secrets del repo son demo).
- Si se sospecha filtración.
- Rotación periódica recomendada: JWT cada 90 días.

## Rotar JWT secrets

Rotar `JWT_ACCESS_SECRET` invalida TODOS los access tokens vigentes (los
usuarios deben re-loguearse; los refresh tokens siguen en BD pero al rotar
también el refresh secret se invalidan).

```bash
openssl rand -hex 32   # nuevo JWT_ACCESS_SECRET
openssl rand -hex 32   # nuevo JWT_REFRESH_SECRET
# Editar .env.production con los nuevos valores y redeploy:
docker compose -f docker-compose.prod.yml --env-file .env.production up -d backend
```

Impacto: todos los usuarios re-login. Opcional: limpiar la tabla
`RefreshToken` (`DELETE FROM "RefreshToken"`).

## Rotar password de Postgres

```bash
# 1. Cambiar el password en el motor.
docker exec -it adminph_postgres_prod psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "ALTER USER ${POSTGRES_USER} WITH PASSWORD '<nuevo>';"
# 2. Actualizar POSTGRES_PASSWORD y DATABASE_URL en .env.production.
# 3. Redeploy del backend.
docker compose -f docker-compose.prod.yml --env-file .env.production up -d backend
```

## Si un secret se filtró al repo

1. Rotar el secret afectado inmediatamente (arriba).
2. Limpiar el historial git con `git filter-repo` o BFG.
3. `git push --force` (coordinar con el equipo).
4. Registrar el incidente.
