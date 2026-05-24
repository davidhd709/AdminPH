# ===== Stage 1: deps (todas las deps para compilar) =====
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ===== Stage 2: builder (genera prisma client + compila a dist/) =====
FROM node:22-alpine AS builder
WORKDIR /app
# Placeholder solo para que prisma.config.ts cargue en build time.
# `prisma generate` NO conecta a la BD; el runtime usa el DATABASE_URL real.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
# Poda a dependencias de producción para copiarlas al runner.
RUN npm prune --omit=dev

# ===== Stage 3: runner (imagen final mínima, usuario no-root) =====
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# wget para el HEALTHCHECK; usuario no-root.
RUN apk add --no-cache wget && addgroup -S app && adduser -S app -G app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

USER app

EXPOSE 3000

# El proceso muere si /health no responde (BD caída, etc.).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:3000/health || exit 1

# Migraciones se aplican en el deploy (no en el arranque del container) para
# evitar carreras con múltiples réplicas. Ver infra/deploy.
CMD ["node", "dist/src/main.js"]
