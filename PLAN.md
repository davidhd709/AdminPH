# AdminPH Backend — Plan completo a producción

> Documento vivo. Cada fase tiene criterio de éxito explícito. Las fases 1-4
> son **higiene + seguridad**, no son opcionales. Las fases 5+ agregan funcionalidad.
> No avanzar a la siguiente fase sin completar la anterior.
> Última revisión: 2026-05-11.

---

## 0. Estado actual (auditado)

### ✅ Lo que ya funciona

| Área                       | Estado                                                                  |
|----------------------------|-------------------------------------------------------------------------|
| Build TypeScript           | `npm run build` exit 0, sin errores                                     |
| Server arranca             | `http://localhost:3000` con Swagger en `/api/docs`                      |
| Auth end-to-end            | Login → JWT → endpoint protegido funciona (smoke test verificado)        |
| Prisma 7 + Driver Adapter  | `@prisma/adapter-pg` configurado en `PrismaService`                      |
| BD PostgreSQL en Docker    | Contenedor `adminph_postgres`, puerto 5434, vacía y migrada             |
| Migraciones                | `20260509032323_init` + `20260512033534_init_align_finance` aplicadas    |
| Schema alineado con código | `companyId`/`type`/`calculationType` etc. en FeeConcept/Fee/Payment      |
| Multi-tenancy en código    | Cada service valida `companyId`/`propertyId` contra `user.companyId`     |
| Soft delete (parcial)      | Campo `deletedAt` en User/Company/Property/Tower/Unit/Fee/Payment/etc.   |
| DTOs validados             | Todos los DTOs principales con decoradores `class-validator`            |
| AuditService               | 29 puntos de invocación a lo largo del código                            |

### ❌ Gaps detectados (priorizados)

| #  | Gap                                                         | Prioridad | Fase |
|----|-------------------------------------------------------------|-----------|------|
| 1  | No es repositorio git, sin `.gitignore`                     | **alta**  | 1    |
| 2  | Sin ESLint/Prettier/EditorConfig                            | **alta**  | 1    |
| 3  | Sin pre-commit hooks (Husky + lint-staged)                  | media     | 1    |
| 4  | `tsconfig.json` con `strict: false` y `strictNullChecks: false` | media | 1    |
| 5  | `TenancyGuard` y `TenancyInterceptor` existen pero **no se aplican** | **alta** | 2 |
| 6  | Soft delete: ~32 queries sin filtro `deletedAt`             | **alta**  | 2    |
| 7  | `AuditLog` no persiste `ipAddress` / `userAgent`            | **alta**  | 2    |
| 8  | Refresh token no rota al usarse                             | **alta**  | 2    |
| 9  | Sin password policy ni bloqueo de cuenta                    | media     | 2    |
| 10 | Sin logger estructurado (usa el de Nest por defecto)        | media     | 3    |
| 11 | Sin `/health` ni `/ready` endpoint                          | **alta**  | 3    |
| 12 | Sin error tracking (Sentry o equivalente)                   | media     | 3    |
| 13 | Sin tests (scripts `lint`/`test` son placeholders)          | **alta**  | 4    |
| 14 | Sin CI (GitHub Actions o equivalente)                       | media     | 4    |
| 15 | Sin Dockerfile para el backend (solo Postgres en compose)   | media     | 9    |
| 16 | DTOs sin `@ApiProperty` (Swagger incompleto)                | media     | 5    |
| 17 | Sin file upload para `receiptUrl` de Payment                | **alta**  | 5    |
| 18 | Sin paginación estándar en `findAll` de servicios           | media     | 5    |
| 19 | Sin recuperación de contraseña ni verificación email        | media     | 6    |
| 20 | Módulos faltantes según contexto AdminPH                    | baja      | 7    |
| 21 | Seed actual mínimo (no cubre flujo financiero)              | media     | 6    |

---

## Fase 1 — Higiene y fundamentos del repositorio ✅ COMPLETA (2026-05-12)

> Detalle en [HISTORIAL.md](HISTORIAL.md). Resumen: git init, .gitignore,
> ESLint flat config + Prettier + EditorConfig, Husky + lint-staged +
> commitlint, TypeScript `strict: true` con limpieza de 76 errores
> (TS6133/TS2564/TS18047/TS2322/etc.), README y CONTRIBUTING completos.
> Auth verificada end-to-end con strict mode. Tag `v0.1.0-mvp-base`.

**Objetivo:** dejar el proyecto listo para colaboración multi-dev con calidad enforced
desde el primer commit.

### 1.1 Inicializar repositorio git

- [ ] `git init` en `Ph/` (raíz del proyecto).
- [ ] Crear `.gitignore` con: `node_modules/`, `dist/`, `.env`, `.env.*.local`,
      `*.log`, `coverage/`, `.idea/`, `.vscode/` (con excepciones para
      `settings.json` compartidos), `*.tsbuildinfo`.
- [ ] Verificar que `.env` **no** se rastree y `.env.example` **sí**.
- [ ] Crear repositorio remoto (GitHub/GitLab) privado.
- [ ] Configurar branch protection en `main`/`master`: requerir PR, status checks,
      al menos 1 reviewer.
- [ ] Primer commit con todo el estado actual + tag `v0.1.0-mvp-base`.

**Criterio de éxito:** `git status` limpio tras `git add .`; `.env` no aparece en `git ls-files`.

### 1.2 ESLint + Prettier + EditorConfig

- [ ] Instalar: `eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
      eslint-config-prettier eslint-plugin-prettier prettier`.
- [ ] `.eslintrc.cjs` con preset `@typescript-eslint/recommended` + `prettier`.
      Reglas extra mínimas: `no-console: warn`, `no-unused-vars: error`,
      `prefer-const`, `@typescript-eslint/no-explicit-any: warn` (queda en warn
      porque hay `user: any` en muchos lugares — limpiar gradualmente).
- [ ] `.prettierrc` con: `singleQuote: false`, `trailingComma: "all"`,
      `printWidth: 100`, `semi: true`.
- [ ] `.editorconfig` con `indent_size = 2`, `end_of_line = lf`, `charset = utf-8`,
      `insert_final_newline = true`.
- [ ] Reemplazar scripts placeholder de `package.json`:
      ```json
      "lint": "eslint \"src/**/*.ts\" \"prisma/**/*.ts\"",
      "lint:fix": "eslint \"src/**/*.ts\" \"prisma/**/*.ts\" --fix",
      "format": "prettier --write \"src/**/*.ts\" \"prisma/**/*.ts\""
      ```
- [ ] Pasar `npm run format` y `npm run lint:fix` una vez en todo el repo.

**Criterio de éxito:** `npm run lint` exit 0.

### 1.3 Pre-commit hooks (Husky + lint-staged + commitlint)

- [ ] Instalar: `husky lint-staged @commitlint/cli @commitlint/config-conventional`.
- [ ] `npx husky init`.
- [ ] Hook `pre-commit`: `npx lint-staged`.
- [ ] Hook `commit-msg`: `npx commitlint --edit "$1"`.
- [ ] `.lintstagedrc`:
      ```json
      { "*.ts": ["eslint --fix", "prettier --write"] }
      ```
- [ ] `commitlint.config.js` con `extends: ["@commitlint/config-conventional"]`.

**Criterio de éxito:** un commit con mensaje no convencional (ej. `"asdf"`) es rechazado.
Un commit con archivo TS mal formateado se formatea automáticamente.

### 1.4 TypeScript estricto

- [ ] Activar gradualmente en `tsconfig.json`:
      ```json
      "strict": true,
      "strictNullChecks": true,
      "noImplicitAny": true,
      "noUnusedLocals": true,
      "noUnusedParameters": false  // queda false: hay user/request no usados en algunos services
      ```
- [ ] Corregir errores que aparezcan. Las soluciones probables:
      - Reemplazar `user: any` por una interface `AuthUser` con `sub`, `email`,
        `role`, `companyId`.
      - Agregar `?` o defaults a campos opcionales.
      - Usar `Prisma.<Model>GetPayload` en findOne con include (ya aplicado en
        towers/units/fee-concepts).
- [ ] **No usar `@ts-ignore`** — investigar cada error.

**Criterio de éxito:** `npm run build` exit 0 con `strict: true`.

### 1.5 README ampliado + CONTRIBUTING.md

- [ ] Reescribir `README.md` con: setup local, requisitos (Node 22, Docker, etc.),
      comandos disponibles, estructura de carpetas, link a Swagger.
- [ ] `CONTRIBUTING.md`: convenciones de commits, branch naming, proceso de PR.
- [ ] `docs/` para ADRs (Architecture Decision Records).

---

## Fase 2 — Seguridad core (multi-tenancy + auth robusto) ✅ COMPLETA (2026-05-14)

> Detalle en [HISTORIAL.md](HISTORIAL.md). Resumen:
> 2.1 TenancyGuard global + `@Public/@SkipTenancy`; 2.2 soft-delete consistente
> (8 queries arregladas + extension stub para activación futura); 2.3 AuditLog
> con `ipAddress`/`userAgent`/`requestId` + LOGIN/LOGOUT/FAILED_LOGIN;
> 2.4 refresh token rotation con SHA-256 hash y detección de reuso; 2.5
> password policy (mín 10 + casing + dígito + símbolo) + lockout 5/30min +
> SafeUser response + fix de password hash; 2.6 Helmet CSP + CORS por env +
> Throttler 3 policies (default/strict/sensitive); 2.7 ValidationPipe seguro.
> Tag `v0.3.0-phase2-complete`.

**Objetivo:** garantizar que ningún dato cruce entre tenants y que la auth sea production-grade.

### 2.1 Aplicar `TenancyGuard` globalmente

- [ ] Revisar `src/core/guards/tenancy.guard.ts`. Refactorizar para que extraiga
      `companyId`/`propertyId` del `request.user` y los inyecte en `request.tenancy`.
- [ ] En `AppModule`, registrar como `APP_GUARD` (junto a `ThrottlerGuard`),
      pero con orden: `JwtAuthGuard` → `RolesGuard` → `TenancyGuard`.
- [ ] Crear decorador `@SkipTenancy()` para endpoints públicos (`/auth/login`,
      `/health`) y endpoints de `SUPERADMIN`.
- [ ] Validar en cada controller que las queries del service reciben el
      `tenancy` del request, no del body.

**Criterio de éxito:** test de integración con dos empresas + sus usuarios
verifica que `COMPANY_ADMIN_A` recibe 403/404 al pedir recursos de `COMPANY_B`.

### 2.2 Soft delete consistente

- [ ] Auditar las ~32 queries que no filtran `deletedAt`. Listar con:
      ```bash
      grep -rn "\.findMany\|\.findFirst\|\.findUnique\|\.update\|\.delete" src/ \
        | grep -v "deletedAt"
      ```
- [ ] Decisión arquitectónica: **reintroducir extension Prisma de soft-delete**.
      En Prisma 7 se usa `Prisma.defineExtension` con `query` hooks que aplican
      `where.deletedAt: null` automáticamente y convierten `delete` en update.
- [ ] Aplicar la extension en `PrismaService` y eliminar los filtros manuales
      redundantes (cleanup).
- [ ] Tests específicos: crear → soft-delete → `findFirst` retorna `null`;
      `findFirst({ where: { deletedAt: { not: null } } })` lo encuentra.

**Criterio de éxito:** una entidad soft-deleted nunca aparece en lecturas
normales; ningún `findUnique` ignora `deletedAt`.

### 2.3 `AuditLog` con IP y User-Agent

- [ ] Migrar schema: agregar `ipAddress: String?` y `userAgent: String?` a `AuditLog`.
- [ ] Actualizar `audit.service.ts` para extraer ambos del `request` y
      persistirlos.
- [ ] Agregar también `requestId` (correlation ID, lo agregamos en fase 3).
- [ ] Verificar que TODAS las acciones críticas registran log: LOGIN, LOGOUT,
      APPROVE/REJECT payment, GENERATE fees, CREATE/UPDATE/DELETE de cualquier
      entidad core, CHANGE_PASSWORD, FAILED_LOGIN.
- [ ] Agregar a enum `AuditAction`: `FAILED_LOGIN`, `CHANGE_PASSWORD`,
      `PASSWORD_RESET`.

**Criterio de éxito:** consulta SQL `SELECT * FROM "AuditLog" WHERE "ipAddress"
IS NULL` retorna 0 filas tras un día de uso.

### 2.4 Refresh token rotation + revocación

- [ ] Cambiar `User.refreshToken: String?` por modelo separado `RefreshToken`:
      ```prisma
      model RefreshToken {
        id        String   @id @default(uuid())
        userId    String
        user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
        tokenHash String   @unique       // bcrypt del token
        expiresAt DateTime
        revokedAt DateTime?
        createdAt DateTime @default(now())
        userAgent String?
        ipAddress String?
        @@index([userId])
      }
      ```
- [ ] En `auth.service.ts`:
      - `login` y `refresh` emiten nuevo refresh token y lo persisten hasheado.
      - `refresh` valida que el token enviado coincide, marca `revokedAt` en el viejo,
        emite uno nuevo (rotación).
      - `logout` revoca todos los refresh tokens del usuario (o solo el actual).
      - Si un refresh token ya revocado se intenta reusar → revocar TODOS los del user
        (signal de robo) y forzar re-login.
- [ ] Hash con bcrypt (10 rounds, igual que password).

**Criterio de éxito:** usar el mismo refresh token dos veces falla en la segunda.

### 2.5 Password policy + bloqueo de cuenta

- [ ] Validator custom `@IsStrongPassword` con: min 10 chars, al menos 1 mayúscula,
      1 minúscula, 1 número, 1 símbolo. Aplicar en `CreateUserDto` y al cambiar password.
- [ ] Modelo nuevo `LoginAttempt` o columnas en `User`: `failedLoginCount: Int @default(0)`,
      `lockedUntil: DateTime?`.
- [ ] Tras 5 intentos fallidos en 15 min → bloquear 30 min.
- [ ] Endpoint admin para desbloquear (`POST /users/:id/unlock`).
- [ ] Audit log de cada intento fallido (`FAILED_LOGIN`) con IP.

**Criterio de éxito:** intento de login con password mal 5 veces seguidas
devuelve 423 (Locked) durante 30 min, registrado en AuditLog.

### 2.6 Helmet + CORS + Throttler endurecidos

- [ ] Helmet con CSP explícito (no default permisivo). Lista blanca de origins
      del frontend.
- [ ] CORS: leer `CORS_ORIGINS` (lista separada por comas) del env, no `*`.
- [ ] Throttler por scope:
      - Global: 100/min (actual).
      - `/auth/login`: 10/min por IP.
      - `/auth/refresh`: 30/min por IP.
      - `/payments` (POST): 20/min por usuario.
- [ ] Usar `@Throttle()` decorator por endpoint cuando aplique.

**Criterio de éxito:** 11 intentos de login desde misma IP en 1 min devuelven 429.

### 2.7 Validation pipe seguro

- [ ] Mantener `whitelist: true, forbidNonWhitelisted: true`.
- [ ] Agregar `transform: true, transformOptions: { enableImplicitConversion: false }`.
- [ ] Considerar `disableErrorMessages: true` solo en producción (evitar leak
      de estructura interna).

---

## Fase 3 — Observabilidad ✅ COMPLETA (2026-05-24)

> Detalle en [HISTORIAL.md](HISTORIAL.md). Resumen:
> 3.1 Pino structured logger (pretty dev / JSON prod, redact de secretos);
> 3.2 Request ID / correlation id (header X-Request-Id end-to-end);
> 3.3 health checks `/live` `/ready` `/health` con @nestjs/terminus;
> 3.4 AllExceptionsFilter global con formato uniforme + traducción de errores
> Prisma (P2002→409, P2025→404, P2003→400). 3.5 (error tracking Sentry/
> Glitchtip) documentada como deuda — requiere DSN/infra. Tag `v0.4.0-phase3-complete`.

**Objetivo:** poder responder "qué pasó" cuando algo falle en producción.

### 3.1 Logger estructurado (Pino)

- [ ] Instalar `nestjs-pino pino-http pino-pretty`.
- [ ] Configurar `LoggerModule.forRoot()` con transport pretty en dev, JSON
      en prod.
- [ ] Reemplazar `console.log`/`Logger` de Nest por inyección de `PinoLogger`.
- [ ] Log automático de request/response (status, duración, userId, requestId).
- [ ] No loguear payloads sensibles: passwords, JWTs, refresh tokens.

### 3.2 Request ID / Correlation ID

- [ ] Middleware que genera `X-Request-Id` si no viene en el header.
- [ ] Inyectarlo en el logger y en `AuditLog`.
- [ ] Devolver el header en cada response.

### 3.3 Health checks

- [ ] Instalar `@nestjs/terminus`.
- [ ] Endpoint `GET /health` con checks: BD (Prisma), memoria, disco.
- [ ] Endpoint `GET /ready` similar pero para readiness probes (k8s).
- [ ] Endpoint `GET /live` para liveness probes.
- [ ] Marcar como `@Public()` (skip auth y tenancy).

### 3.4 Error tracking

- [ ] Decidir Sentry (cloud) vs Glitchtip (self-hosted en mismo VPS).
- [ ] Instalar SDK y enviar excepciones no manejadas + 5xx.
- [ ] Filtros para no enviar PII (email, document, password aunque hasheado).

### 3.5 Métricas (opcional, fase tardía)

- [ ] `@willsoto/nestjs-prometheus` con endpoint `/metrics` protegido.
- [ ] Métricas custom: pagos aprobados/rechazados, cuotas generadas,
      logins fallidos, latencia por endpoint.

---

## Fase 4 — Testing y CI ✅ COMPLETA (2026-05-24)

> Detalle en [HISTORIAL.md](HISTORIAL.md). Resumen:
> 4.1 Jest + ts-jest configurado (unit + e2e configs, tsconfig.build excluye
> specs); 4.2 27 unit tests en 5 suites (auth, fees, late-fee,
> account-statement, password validator); 4.4 5 E2E de auth flow contra BD
> real (login, 401, tenancy, refresh rotation) — descubrió y arregló bug de
> producción (refresh token duplicado en mismo segundo → `jti`); 4.5 GitHub
> Actions CI (Postgres service, lint+build+migrate+unit+e2e+coverage).
> 4.3 (integración dedicada) cubierta por los E2E. Tag `v0.5.0-phase4-complete`.

**Objetivo:** evitar regresiones en cada cambio.

### 4.1 Configurar Jest

- [ ] Instalar `jest @types/jest ts-jest @nestjs/testing supertest`.
- [ ] `jest.config.ts` con `testEnvironment: "node"`, `setupFiles`, coverage
      `text-summary` + `html`, threshold inicial 50% (subir a 70% en 6 meses).
- [ ] Scripts:
      ```json
      "test": "jest",
      "test:watch": "jest --watch",
      "test:cov": "jest --coverage",
      "test:e2e": "jest --config jest-e2e.config.ts"
      ```

### 4.2 Tests unitarios (servicios críticos)

- [ ] `auth.service.spec.ts`: validateUser, generateTokens, password hashing.
- [ ] `fees.service.spec.ts`: cálculo por FIXED vs COEFFICIENT, evitar duplicados.
- [ ] `payments.service.spec.ts`: approve allocation (oldest first), reject,
      transacciones rollback.
- [ ] `late-fee.service.spec.ts`: cálculo DAILY vs MONTHLY, grace days.
- [ ] `account-statement.service.spec.ts`: paz y salvo true/false.

Mockear `PrismaService` y `AuditService`.

### 4.3 Tests de integración (con BD real)

- [ ] Spin up Postgres de test con docker-compose `docker-compose.test.yml`
      en otro puerto (ej. 5435).
- [ ] Migrar BD test antes de cada suite.
- [ ] Probar flujos: register → login → CRUD → soft-delete → re-create.

### 4.4 Tests E2E (auth + multi-tenancy)

- [ ] `test/auth.e2e-spec.ts`: login OK, login fail, token expirado, refresh
      rotation, logout.
- [ ] `test/multitenancy.e2e-spec.ts`: empresa A no puede ver datos de empresa B.
- [ ] `test/payment-flow.e2e-spec.ts`: subir pago → aprobar → estado de cuenta
      refleja deuda menor.

### 4.5 GitHub Actions CI

- [ ] `.github/workflows/ci.yml`:
      - On `pull_request` y `push` a `main`.
      - Matrix con Node 22.
      - Steps: install, lint, build, test (con Postgres service container),
        upload coverage.
- [ ] Status check obligatorio en branch protection.

**Criterio de éxito:** PR rojo bloquea merge.

---

## Fase 5 — API surface completa para MVP ✅ COMPLETA (2026-05-24, parcial)

> Detalle en [HISTORIAL.md](HISTORIAL.md). Resumen:
> 5.1 paginación estándar (PaginationDto + helper paginate) aplicada a
> companies/properties/towers/units/fees; 5.3 Swagger completo (@ApiTags,
> @ApiProperty, @ApiBearerAuth) en 12 controllers + 12 DTOs; 5.4 versionado
> URI /api/v1 + configureApp compartido; 5.6 errores uniformes (hecho en
> Fase 3.4).
> **Diferido:** 5.2 file upload de comprobantes → Fase 9 (requiere decisión
> de storage R2/MinIO). 5.5 response DTOs → cerrado como suficiente: el único
> secreto (User.password) ya está cubierto por SafeUser (Fase 2.5) y
> refreshToken vive en tabla aparte; ClassSerializerInterceptor global queda
> como mejora incremental. Tag `v0.6.0-phase5-complete`.

**Objetivo:** que el MVP del contexto AdminPH (sección 6) sea consumible por un frontend.

### 5.1 Paginación estándar

- [ ] DTO `PaginationDto { page?: number; pageSize?: number; sortBy?: string; sortOrder?: 'asc'|'desc' }`.
- [ ] Helper `paginate(prisma.model, where, paginationDto)` que retorna
      `{ items, total, page, pageSize, totalPages }`.
- [ ] Aplicar en TODOS los `findAll` (companies, properties, towers, units,
      people, fees, payments, audit logs).

### 5.2 File upload (comprobantes de pago)

- [ ] Decidir storage: MinIO (self-hosted en VPS) o Cloudflare R2 (más barato).
- [ ] Instalar `@nestjs/platform-express multer aws-sdk` (R2 es S3-compatible).
- [ ] Endpoint `POST /payments` con `@UseInterceptors(FileInterceptor('receipt'))`.
- [ ] Validar: tipo `image/jpeg|image/png|application/pdf`, max 5MB.
- [ ] Subir a R2/MinIO con key `payments/{propertyId}/{paymentId}/{filename}`.
- [ ] Guardar URL en `Payment.receiptUrl`.
- [ ] Endpoint `GET /payments/:id/receipt` con presigned URL (10 min de TTL).

### 5.3 Swagger completo

- [ ] Agregar `@ApiProperty()` en TODOS los DTOs (request y response).
- [ ] `@ApiTags()` en cada controller.
- [ ] `@ApiResponse()` con códigos esperados.
- [ ] `@ApiBearerAuth()` en controllers protegidos.
- [ ] Generar `openapi.json` con `npm run docs:json` para reusar en frontend.

### 5.4 Versionado de API

- [ ] Configurar `app.enableVersioning({ type: VersioningType.URI })`.
- [ ] Prefijo global `/api/v1`.
- [ ] Swagger refleja `/api/v1/...`.

### 5.5 DTOs de respuesta (separados de Prisma)

- [ ] Crear `*.response.dto.ts` que excluyan campos sensibles (`password`,
      `refreshToken`).
- [ ] Usar `class-transformer` con `@Exclude()`/`@Expose()`.
- [ ] `ClassSerializerInterceptor` global.

### 5.6 Manejo uniforme de errores

- [ ] Exception filter global que convierte errores Prisma (`P2002` unique,
      `P2025` not found) a HTTP correctos (409, 404).
- [ ] Formato de error consistente:
      ```json
      { "statusCode": 400, "message": "...", "code": "VALIDATION_ERROR", "requestId": "..." }
      ```

---

## Fase 6 — Completar funcionalidad de auth y seed ✅ COMPLETA (2026-05-24, parcial)

> Detalle en [HISTORIAL.md](HISTORIAL.md). Resumen:
> 6.1 password reset (modelo PasswordResetToken, MailService abstracto con
> log-transport, forgot/reset endpoints anti user-enumeration, revoca
> sesiones); 6.3 self-service (GET/PATCH /users/me + change-password que
> revoca sesiones); 6.4 seed enriquecido idempotente (2 empresas, 4
> copropiedades, 12 torres, 60 unidades, 120 cuotas, password demo
> AdminPH2026!). **6.2 email verification:** infra lista (campo
> emailVerifiedAt + MailService.sendEmailVerification), flujo completo
> diferido como deuda (opcional MVP). Tag `v0.7.0-phase6-complete`.

**Nota:** el MailService real (Resend/SendGrid/SMTP) se conecta en Fase 8.2;
hoy usa log-transport (loguea el email en dev/CI).

### 6.1 Recuperación de contraseña

- [ ] Modelo `PasswordResetToken { id, userId, tokenHash, expiresAt, usedAt }`.
- [ ] `POST /auth/forgot-password` con email → genera token, envía email.
- [ ] `POST /auth/reset-password` con token + new password → valida y actualiza.
- [ ] Tokens expiran en 1 hora, single-use.
- [ ] Servicio de email: SendGrid / Resend / Mailgun (decidir).

### 6.2 Verificación de email (opcional MVP)

- [ ] Campo `User.emailVerifiedAt: DateTime?`.
- [ ] Modelo `EmailVerificationToken`.
- [ ] Endpoint `POST /auth/verify-email`.
- [ ] Bloquear login si `emailVerifiedAt == null` y `requireEmailVerification` activo.

### 6.3 `/me` y cambio de password

- [ ] `GET /users/me` (ya existe via `users.controller.getMe`).
- [ ] `PATCH /users/me` para actualizar fullName, phone.
- [ ] `POST /users/me/change-password` con `oldPassword` + `newPassword`.

### 6.4 Seed enriquecido

- [ ] `prisma/seed.ts` debe crear:
      - 1 SUPERADMIN.
      - 2 empresas (para validar multi-tenancy).
      - 2 copropiedades por empresa.
      - 1 administrador por copropiedad.
      - 3 torres × 10 unidades por copropiedad.
      - 5 conceptos de cobro (administración, parqueadero, multa, mora, extraordinaria).
      - LateFeeConfig activo por copropiedad.
      - 3 propietarios + 3 residentes por copropiedad.
      - Cuotas generadas para 2 períodos.
- [ ] Idempotente: re-ejecutar no duplica datos.

---

## Fase 7 — Módulos faltantes (post-MVP, según AdminPH contexto)

### 7.1 PQR (sección 5.6 del contexto)
### 7.2 Comunicados (sección 5.7)
### 7.3 Reservas de zonas comunes (sección 5.8)
### 7.4 Visitantes y portería (sección 5.9)
### 7.5 Mascotas y vehículos (sección 5.10)
### 7.6 Asambleas (sección 5.11)
### 7.7 Votaciones por coeficiente (sección 5.12)
### 7.8 Actas y documentos (sección 5.13)
### 7.9 Contabilidad administrativa (sección 5.14)

Cada uno repite el patrón: modelo Prisma → migration → service → controller →
DTOs → tests → docs. Ninguno antes de tener MVP financiero estable.

---

## Fase 8 — Integraciones externas

### 8.1 Pasarela de pagos (PSE / Wompi / ePayco)
### 8.2 Envío de email transaccional (SendGrid / Resend)
### 8.3 WhatsApp Business API (notificaciones)
### 8.4 Generación de PDF (estados de cuenta, paz y salvo)
### 8.5 Exportación a Excel (cartera, listados)
### 8.6 Webhook para confirmación automática de pagos

---

## Fase 9 — Infraestructura producción ✅ COMPLETA (2026-05-24)

> Detalle en [HISTORIAL.md](HISTORIAL.md). Resumen:
> 9.1 Dockerfile multi-stage (verificado: imagen construye, container arranca
> en prod, /health 200); 9.2 docker-compose dev (postgres+minio+mailhog) +
> prod (postgres+backend+nginx); 9.4 Nginx con TLS/HSTS/rate-limit;
> 9.6 backup-db.sh (pg_dump -Fc + retención + rclone); 9.5 deploy.yml
> (GHCR + SSH, guarded); 9.3 .env.production.example; 9.7 uptime documentado.
> Runbooks: deploy, restore, rotate-secrets. Tag `v0.8.0-phase9-complete`.
> Deuda: optimizar tamaño de imagen (~769MB por engines Prisma).

### 9.1 Dockerfile multi-stage

- [ ] `backend/Dockerfile` con stages: `deps`, `builder`, `runner`.
- [ ] Imagen final basada en `node:22-alpine`, usuario no-root, solo `dist/`
      y `node_modules` de prod.
- [ ] Health check del container con `wget /health`.
- [ ] Tamaño objetivo < 300 MB.

### 9.2 docker-compose completo para dev

- [ ] Postgres (ya está) + Backend + MinIO + Mailhog (test emails) + Adminer
      (opcional).

### 9.3 Secrets management

- [ ] No commitear secrets. Usar `.env` local + `.env.production` en VPS
      vía `scp` o `doppler`/`vault`/`sops`.
- [ ] Rotar `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` antes de salir a prod.

### 9.4 Reverse proxy

- [ ] Nginx config con: HTTPS (Let's Encrypt vía Certbot), rate limiting,
      gzip, proxy a `localhost:3000`, headers de seguridad.
- [ ] HSTS, redirect HTTP → HTTPS.

### 9.5 CI/CD continuo

- [ ] GitHub Action workflow `deploy.yml` on push a `main`:
      build → test → docker build → push a registry → SSH deploy a VPS.
- [ ] Migrations corren antes de cambiar el container running.
- [ ] Rollback strategy documentada.

### 9.6 Backups de BD

- [ ] Script `pg_dump` diario, retención 7 días local + 30 días en R2.
- [ ] Probar restore al menos 1 vez antes de prod.

### 9.7 Monitoreo de uptime

- [ ] UptimeRobot o Healthchecks.io pinging `/health` cada 5 min.

---

## Fase 10 — Documentación final

### 10.1 OpenAPI / Postman

- [ ] Publicar Swagger UI en `/api/docs` (público en dev, protegido en prod).
- [ ] Exportar `openapi.json` para que el equipo de frontend genere clientes
      tipados.
- [ ] Colección Postman con ejemplos por endpoint.

### 10.2 ADRs (Architecture Decision Records)

- [ ] `docs/adr/001-multi-tenancy-strategy.md` (single DB + companyId vs DB per tenant).
- [ ] `docs/adr/002-soft-delete-with-extension.md`.
- [ ] `docs/adr/003-refresh-token-rotation.md`.
- [ ] `docs/adr/004-storage-provider-choice.md`.
- [ ] etc.

### 10.3 Runbooks

- [ ] `docs/runbooks/incident-db-down.md`.
- [ ] `docs/runbooks/rotate-jwt-secrets.md`.
- [ ] `docs/runbooks/restore-from-backup.md`.
- [ ] `docs/runbooks/manual-payment-allocation.md`.

---

## Estructura de carpetas objetivo (al final)

```txt
Ph/
├── .git/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── .gitignore
├── .editorconfig
├── README.md
├── CONTRIBUTING.md
├── HISTORIAL.md
├── PLAN.md
├── AdminPH_contexto_completo.md
├── docker-compose.yml              # dev: postgres + backend + minio + mailhog
├── docker-compose.test.yml         # test: postgres en otro puerto
├── docs/
│   ├── adr/
│   │   ├── 001-multi-tenancy-strategy.md
│   │   └── ...
│   └── runbooks/
│       └── ...
├── infra/
│   └── nginx/
│       └── adminph.conf
└── backend/
    ├── .eslintrc.cjs
    ├── .prettierrc
    ├── .lintstagedrc
    ├── commitlint.config.js
    ├── .husky/
    │   ├── pre-commit
    │   └── commit-msg
    ├── .env.example                # sin valores reales
    ├── Dockerfile
    ├── jest.config.ts
    ├── jest-e2e.config.ts
    ├── nest-cli.json
    ├── package.json
    ├── prisma.config.ts
    ├── tsconfig.json               # strict: true
    ├── tsconfig.build.json
    ├── prisma/
    │   ├── schema.prisma
    │   ├── seed.ts                 # enriquecido
    │   └── migrations/
    ├── src/
    │   ├── main.ts
    │   ├── app.module.ts
    │   ├── core/
    │   │   ├── decorators/
    │   │   │   ├── current-user.decorator.ts
    │   │   │   ├── roles.decorator.ts
    │   │   │   ├── public.decorator.ts          # @Public() para skip auth
    │   │   │   ├── skip-tenancy.decorator.ts
    │   │   │   └── api-paginated.decorator.ts
    │   │   ├── guards/
    │   │   │   ├── jwt-auth.guard.ts
    │   │   │   ├── roles.guard.ts
    │   │   │   └── tenancy.guard.ts             # AHORA aplicado global
    │   │   ├── interceptors/
    │   │   │   ├── audit.interceptor.ts
    │   │   │   ├── transform.interceptor.ts     # respuestas uniformes
    │   │   │   └── logger.interceptor.ts
    │   │   ├── filters/
    │   │   │   ├── all-exceptions.filter.ts
    │   │   │   └── prisma-exception.filter.ts
    │   │   ├── middleware/
    │   │   │   └── request-id.middleware.ts
    │   │   ├── pipes/
    │   │   │   └── parse-uuid.pipe.ts
    │   │   ├── dto/
    │   │   │   ├── pagination.dto.ts
    │   │   │   └── api-error.dto.ts
    │   │   ├── types/
    │   │   │   └── auth-user.ts                 # tipa user en lugar de any
    │   │   └── prisma/
    │   │       └── soft-delete-extension.ts     # reactivada
    │   ├── modules/
    │   │   ├── prisma/
    │   │   ├── health/                          # NUEVO
    │   │   ├── auth/
    │   │   │   ├── strategies/
    │   │   │   │   └── jwt.strategy.ts          # passport-jwt formal
    │   │   │   └── ...
    │   │   ├── users/
    │   │   ├── companies/
    │   │   ├── properties/
    │   │   ├── towers/
    │   │   ├── units/
    │   │   ├── people/
    │   │   ├── finance/
    │   │   ├── payments/
    │   │   ├── audit/
    │   │   ├── storage/                         # NUEVO (R2/MinIO wrapper)
    │   │   ├── mail/                            # NUEVO (SendGrid/Resend wrapper)
    │   │   └── notifications/                   # NUEVO (WhatsApp / email)
    │   └── common/
    │       ├── utils/
    │       └── constants/
    └── test/
        ├── auth.e2e-spec.ts
        ├── multitenancy.e2e-spec.ts
        ├── payment-flow.e2e-spec.ts
        └── jest-e2e.config.ts
```

---

## Convenciones y reglas no-negociables

1. **Cero `any` en código nuevo.** El `user: any` actual queda como deuda, se
   reemplaza por `AuthUser` interface gradualmente.
2. **Cada PR debe pasar lint + build + tests.** Branch protection lo enforce.
3. **Conventional commits obligatorio**: `feat:`, `fix:`, `chore:`, `refactor:`,
   `test:`, `docs:`. Sin esto no se mergea.
4. **Migraciones siempre vía `prisma migrate dev`** en local; en CI/prod vía
   `prisma migrate deploy`. Nunca editar a mano una migración ya aplicada.
5. **Nada de `prisma db push` en main.**
6. **Nunca commitear `.env`.** Si se filtra, rotar secrets y limpiar historial.
7. **Tenancy se valida en backend, NUNCA se confía en el cliente.** Ningún
   endpoint usa `companyId`/`propertyId` del body sin validación contra
   `request.user`.
8. **Pagos siempre dentro de `prisma.$transaction`.**
9. **Paz y salvo nunca se genera con `totalPending > 0` ni pagos pendientes
   de revisión.**
10. **Soft delete por defecto; hard delete requiere job dedicado con audit doble.**

---

## Roadmap temporal sugerido

| Mes | Foco principal                                    |
|-----|---------------------------------------------------|
| 1   | Fase 1 (higiene) + Fase 2 (seguridad core)        |
| 2   | Fase 3 (observabilidad) + Fase 4 (testing/CI)     |
| 3   | Fase 5 (API completa) + Fase 6 (auth completa + seed) |
| 4   | Fase 9 (infra prod) + lanzamiento beta a 1 cliente |
| 5-6 | Fase 7 (PQR, comunicados, reservas, portería)     |
| 7-9 | Fase 7 (asambleas, votaciones, contabilidad)      |
| 10+ | Fase 8 (pasarela, WhatsApp, PDFs)                 |

---

## Criterio "backend al 100%"

El backend está "al 100% para producción" cuando:

- ✅ Fases 1-6 + 9 completas.
- ✅ Tests con coverage ≥ 70% en services críticos.
- ✅ CI verde en `main` durante 30 días continuos.
- ✅ 1 cliente real usando el sistema en producción sin incidentes mayores.
- ✅ Backup + restore probado al menos 1 vez al mes.
- ✅ Documentación completa para que un dev nuevo arranque en < 1 día.
- ✅ Multi-tenancy validado con 2+ empresas reales sin filtración de datos.

Las fases 7-8 son **expansión funcional**, no son requisito para "100% backend"
sino para "AdminPH producto completo según contexto".
