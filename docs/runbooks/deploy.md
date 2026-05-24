# Runbook — Deploy a producción (VPS Contabo)

## Prerequisitos (una vez)

1. VPS Ubuntu 24.04 con Docker + Docker Compose.
2. Clonar el repo en `/opt/adminph`.
3. Copiar `backend/.env.production.example` → `.env.production` en la raíz y
   completar secrets (`openssl rand -hex 32` para los JWT).
4. DNS: apuntar `api.adminph.example` al VPS (Cloudflare).
5. Certificados TLS en `infra/nginx/certs/` (`fullchain.pem`, `privkey.pem`)
   vía Certbot/Let's Encrypt.
6. En GitHub: configurar secrets `SSH_HOST`, `SSH_USER`, `SSH_KEY`,
   `DEPLOY_PATH` y la variable `DEPLOY_ENABLED=true`.

## Deploy automático (recomendado)

El workflow `.github/workflows/deploy.yml` se dispara con `workflow_dispatch`
(o con tags `v*.*.*` al descomentar). Hace: build imagen → push a GHCR →
SSH al VPS → `prisma migrate deploy` → `docker compose up -d`.

## Deploy manual (fallback)

```bash
cd /opt/adminph
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production build backend
# Migraciones ANTES de levantar la nueva versión:
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm backend npx prisma migrate deploy
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
docker image prune -f
```

## Verificación post-deploy

```bash
curl -fsS https://api.adminph.example/health   # debe responder 200 con database: up
docker compose -f docker-compose.prod.yml ps    # todos "healthy"
docker logs adminph_backend_prod --tail 50
```

## Rollback

```bash
export BACKEND_IMAGE=ghcr.io/davidhd709/adminph/backend:<sha-anterior>
docker compose -f docker-compose.prod.yml --env-file .env.production up -d backend
```
Si la migración rompió algo: ver `restore-from-backup.md`.

## Monitoreo de uptime (Fase 9.7)

- Configurar UptimeRobot o Healthchecks.io para hacer GET a
  `https://api.adminph.example/health` cada 5 min.
- Alerta por email/WhatsApp si responde != 200 dos veces seguidas.
- El endpoint `/health` valida BD + memoria, así que cubre el caso de
  "proceso vivo pero BD caída".
