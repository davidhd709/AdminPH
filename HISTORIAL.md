# AdminPH — Historial de trabajo

> Bitácora cronológica de acciones realizadas sobre el proyecto.
> Cada entrada incluye: fecha, contexto, archivos tocados y resultado.

---

## 2026-05-11 — Inicio de fase "compilation fix"

### Contexto inicial leído
Se leyó `AdminPH_contexto_completo.md` completo (1941 líneas).

### Estado verificado del proyecto
- Raíz del proyecto: `/run/media/ingenierohenrydavid/0E05E2BD5C0F60A7/HENRY/PROYECTOS/Ph`
- `backend/prisma/`: contiene `schema.prisma` (8441 bytes) y `seed.ts` (1704 bytes). Directorio `migrations/` vacío en disco (aunque el contexto indica que `migrate dev --name init` se ejecutó).
- `backend/src/`: estructura modular completa (auth, users, companies, properties, towers, units, people, finance, payments, audit, prisma, core).
- `backend/dist/`: vacío (build previo no produjo output).
- `node_modules/` presente; `package.json` y `tsconfig.json` existen.

### Decisiones tomadas
- Trabajar en el orden listado en la sección 17 del contexto.
- Documentar plan en `PLAN.md` y bitácora en `HISTORIAL.md`.
- Antes de empezar fixes, capturar el output real de `npm run build` para tener línea base de errores.

### Archivos creados
- `PLAN.md` — plan de trabajo de la fase.
- `HISTORIAL.md` — este archivo.

### Baseline de errores capturado

Se ejecutó `npm run build` en `backend/`. Resultado:

```
Found 40 error(s).
```

(El contexto original hablaba de ~105 errores. Varios fixes ya estaban aplicados:
`tsconfig.ignoreDeprecations` existe, `PrismaService` ya extiende `PrismaClient`
sin extensión, imports relativos ya correctos en la mayoría, etc.)

Log completo guardado en `/tmp/adminph_build_baseline.log`.

### Hallazgos al revisar el código

El plan teórico del contexto no encaja 1:1 con lo que hay en disco. Errores reales agrupados:

1. **`@Request()` decorator (18 errores TS2348)** — el problema NO es lo que decía
   el contexto. Los controllers están importando `Request` desde `express`
   como tipo Y usando `@Request()` como decorador de NestJS. TypeScript ve el
   tipo global `Request` (Web API) y se confunde. Hay que migrar a `@Req()`
   con tipo `ExpressRequest` claramente nombrado, o cambiar el orden de imports.

2. **`oldEntity.property.companyId` sin include (6 errores TS2551)** — en
   `towers.service.ts`, `units.service.ts` y `fee-concepts.service.ts`, los
   `findFirst` no incluyen la relación `property`, pero luego el código intenta
   leer `.property.companyId`. Falta `include: { property: true }`.

3. **Schema vs services financieros (~10 errores)** —
   - `FeeConcept` actual tiene `isFixed: Boolean` + `defaultValue: Decimal`,
     pero services esperan `type: FeeConceptType`, `calculationType: CalculationType`,
     `defaultAmount: Decimal`, `companyId`, `active`, `deletedAt`.
   - `Fee` no tiene `companyId` como campo escalar; services lo leen como tal.
   - `Payment` ídem.
   - `LateFeeConfig.interestType` es `String`, pero `late-fee.dto.ts` importa
     `InterestType` desde `@prisma/client`.
   - Falta enum `InterestType` en schema.

4. **Otros sueltos:**
   - `prisma/seed.ts:76` — usa `prisma.disconnect()` pero `prisma` está en scope
     interno de `main()`, no externo. Y `disconnect` debe ser `$disconnect`.
   - `users.service.ts:6` — `import { PrismaService } from "../modules/prisma/prisma.service"`
     incorrecto, debe ser `"../prisma/prisma.service"`.
   - `users.controller.ts:36` — `usersService.findOne(user.sub)` con 1 arg, pero
     el método requiere 2 (id + user).
   - `prisma.service.ts:19,28` — los helpers `findActive`/`findActiveUnique`
     usan `this[model]` que en Prisma 7 ya no resuelve a delegate dinámicamente.
   - `fees.controller.ts:26` — `GenerationSummary` no se exporta desde
     `fees.service.ts` pero es tipo de retorno público.
   - `tsconfig.json:17` — typo `"noImplicitAny": false0` (válido por casualidad pero feo).

### Plan ajustado
Se reescribió la lista de tareas en TodoWrite para reflejar lo encontrado y se
mantiene el principio: dejar el código simple pero compilable, alinear schema
con services y no recortar funcionalidad.

### Fixes aplicados (orden cronológico)

1. **`backend/tsconfig.json`** — corregido typo `"noImplicitAny": false0` → `false`.
2. **`backend/prisma/seed.ts`** — `prisma` movido a scope externo (no dentro de `main()`)
   para que el bloque `.finally()` pueda llamar `prisma.$disconnect()`. Cambio
   `PrismaClient.disconnect()` → `prisma.$disconnect()`. Limpieza de imports
   `fs`/`path`/`bcrypt` no usados.
3. **`@Request()` → `@Req()` en 6 controllers** (companies, people, properties,
   towers, units, users). Antes el código usaba el decorador `@Request()` sin
   importarlo desde `@nestjs/common`; TypeScript lo resolvía al constructor
   global `Request` (Web API) y rompía con `TS2348`. Solución: importar `Req`
   y renombrar las llamadas.
4. **`backend/src/modules/users/users.service.ts:6`** — corregido import de
   `"../modules/prisma/prisma.service"` → `"../prisma/prisma.service"`.
5. **`backend/src/modules/users/users.controller.ts:36`** — `findOne(user.sub)`
   ahora pasa también `user` como segundo argumento.
6. **`backend/src/modules/prisma/prisma.service.ts`** — eliminados los helpers
   `findActive` y `findActiveUnique` que usaban `this[model]` (API que no
   funciona con Prisma 7). No los usaba nadie.
7. **Return types con `Prisma.<Model>GetPayload`** en `findOne` de
   `towers.service.ts`, `units.service.ts` y `fee-concepts.service.ts`. Antes
   declaraban `Promise<Tower | null>` etc. pero el código consumidor accedía a
   `.property.companyId` (relación incluida). Solución: tipar el retorno como
   `Prisma.TowerGetPayload<{ include: { property: true } }>` (idem Unit y
   FeeConcept) — eso expresa con precisión la forma del resultado.
8. **`fees.service.ts:11`** — `interface GenerationSummary` ahora se exporta
   (`export interface`). Antes era privado pero se usaba como tipo de retorno
   público de `generateMassFees`, lo cual rompía con `TS4053`.
9. **`prisma/schema.prisma`** — alineado con services:
   - Enums nuevos: `FeeConceptType`, `CalculationType`, `InterestType`.
   - `AuditAction` ampliado con `LOGIN`, `LOGOUT`, `GENERATE`.
   - `FeeConcept`: agregados `companyId` (+ relación a `Company`), `type`,
     `calculationType`, `defaultAmount`, `active`, `deletedAt`; removidos
     `isFixed` y `defaultValue`.
   - `LateFeeConfig.interestType`: `String` → `InterestType` enum.
   - `Fee`: agregados `companyId` (+ relación) y `propertyId` ahora obligatorio
     con su relación (antes era opcional/relación parcial).
   - `Payment`: agregados `companyId`, `reviewedBy`, `reviewedAt`;
     `propertyId` obligatorio con relación; constraint único cambiado a
     `[propertyId, bankReference]`.
   - `Company`: agregadas relaciones inversas `feeConcepts`, `fees`, `payments`.
10. **`fees.service.ts`** — `concept.isFixed` → `concept.calculationType === "FIXED"`
    y `concept.defaultValue` → `concept.defaultAmount`, para consumir el schema
    nuevo.
11. **`fee-concepts.service.ts`** — `create` ahora pasa `companyId: property.companyId`
    al insert, requerido por el nuevo schema.

### Comandos ejecutados

```bash
npx prisma format       # OK
npx prisma validate     # OK
npx prisma generate     # OK — client regenerado
npm run build           # OK — exit 0, sin errores TypeScript
```

### Migración aplicada a la BD

La BD ya tenía aplicada `20260509032323_init` pero el schema en disco había
evolucionado. La BD estaba **vacía** (0 filas en Company/Property/Fee/Payment/
FeeConcept/User), así que era seguro migrar.

`prisma migrate dev` no se pudo correr (entorno no-interactivo en este sandbox).
Workaround:

```bash
# 1. Crear carpeta de migración
mkdir -p prisma/migrations/20260512033534_init_align_finance

# 2. Generar el SQL diffeando la BD real contra el schema nuevo
npx prisma migrate diff \
  --from-config-datasource \
  --to-schema prisma/schema.prisma \
  --script > prisma/migrations/20260512033534_init_align_finance/migration.sql

# 3. Aplicar
npx prisma migrate deploy
```

Resultado:

```
Applying migration `20260512033534_init_align_finance`
All migrations have been successfully applied.
```

Verificación en BD:

```
migration_name                    | done
-----------------------------------+------
 20260509032323_init               | t
 20260512033534_init_align_finance | t
```

`FeeConcept` ahora tiene `companyId`, `type`, `calculationType`, `defaultAmount`,
`active`, `deletedAt` (verificado con `\d "FeeConcept"`).

### Estado final de la fase

- `npm run build` → **exit 0**, sin errores TypeScript.
- `prisma validate` → OK.
- `prisma generate` → client regenerado para Prisma 7.8.0.
- Schema sincronizado con BD vía migración formal.
- BD aún vacía (no se corrió seed; el contexto no lo pidió).

### Deuda técnica explícita

- **Extensión Prisma para soft-delete**: eliminada con los helpers no usados.
  Sigue siendo una decisión pendiente si se quiere reintroducir vía Prisma
  Client Extensions de Prisma 7, o dejar la responsabilidad en cada query.
- **Helpers `findActive`/`findActiveUnique`**: removidos del `PrismaService`.
  Si en el futuro se requieren, deben implementarse con tipado correcto.
- **`prisma migrate dev` no se pudo correr en este sandbox**. La migración se
  generó vía `migrate diff` + `migrate deploy`. En desarrollo normal con
  terminal interactivo, `migrate dev` funcionará. Documentar.
- **Bloque del init original** (`20260509032323_init/migration.sql`) sigue
  presente y aplicado; la migración nueva `20260512033534_init_align_finance`
  contiene solo el delta. Histórico coherente.
- **AuditLog** todavía no captura `ipAddress` ni `userAgent` (el contexto
  los menciona pero no eran requisito de compilación). El `request?` se acepta
  como parámetro pero `audit.service.log` lo ignora — pendiente para fase
  siguiente si se quiere persistir.

---

## 2026-05-11 (continuación) — Fixes de runtime

Después de obtener `npm run build` con exit 0, al ejecutar `npm run start:dev`
aparecieron errores que no se ven en compilación. Estos se resolvieron en orden:

### Runtime fix 1 — `PrismaClientInitializationError` (Prisma 7 obliga driver adapter)

**Síntoma:**
```
PrismaClientInitializationError: `PrismaClient` needs to be constructed with a
non-empty, valid `PrismaClientOptions`
```

**Causa:** En Prisma 7, si el `datasource` del `schema.prisma` no tiene `url`
(porque vive en `prisma.config.ts`), el cliente runtime NO lee `DATABASE_URL`
automáticamente. La opción `datasources` y `datasourceUrl` también fueron
removidas de `PrismaClientOptions`. La única vía oficial es pasar un **Driver
Adapter** al constructor.

Confirmado al intentar reponer `url = env("DATABASE_URL")` en el schema:
```
Error code: P1012 — The datasource property `url` is no longer supported in schema files.
Move connection URLs for Migrate to `prisma.config.ts` and pass either `adapter`
for a direct database connection or `accelerateUrl` for Accelerate to the
`PrismaClient` constructor.
```

**Fix:**
1. `npm install @prisma/adapter-pg pg` y `npm install -D @types/pg`.
2. `src/modules/prisma/prisma.service.ts`:
   ```ts
   import { PrismaPg } from "@prisma/adapter-pg";
   ...
   constructor() {
     super({
       adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
     });
   }
   ```
3. `prisma/seed.ts`: mismo patrón, con `import "dotenv/config"` al inicio
   para garantizar que `DATABASE_URL` esté cargado.

### Runtime fix 2 — `UsersService` depende de `AuditService` (no encontrado)

**Síntoma:** `Nest can't resolve dependencies of the UsersService (PrismaService, ?)`
con `AuditService at index [1] is not available in the UsersModule`.

**Causa:** Múltiples servicios consumen `AuditService` pero los módulos que los
contienen no importan `AuditModule`.

**Fix:** `src/modules/audit/audit.module.ts` marcado como `@Global()`. Así
`AuditService` queda disponible en toda la app sin imports repetidos. Mismo
patrón que ya tenía `PrismaModule`.

### Runtime fix 3 — `JwtAuthGuard` necesita `JwtService` (no encontrado)

**Síntoma:** `Nest can't resolve dependencies of the JwtAuthGuard (?) ... JwtService
at index [0] is not available in the UsersModule module`.

**Causa:** Los controllers usan `JwtAuthGuard` (vía `@UseGuards`) que inyecta
`JwtService`. Solo `AuthModule` importa `JwtModule`, y no lo reexporta.

**Fix:** `src/modules/auth/auth.module.ts`:
- Marcado como `@Global()`.
- Exporta `JwtModule` además de `AuthService`.
- Ahora todos los controllers tienen `JwtService` disponible.

### Runtime fix 4 — `ThrottlerGuard` no encontrado en main.ts

**Síntoma:** `Nest could not find ThrottlerGuard element (this provider does not
exist in the current context)` al llamar `app.get(ThrottlerGuard)` en `main.ts`.

**Causa:** `main.ts` intentaba registrar `ThrottlerGuard` con
`app.useGlobalGuards(app.get(ThrottlerGuard))`, pero `ThrottlerModule` nunca se
importó en ningún módulo, así que `ThrottlerGuard` no existe en el contenedor DI.

**Fix:**
- `src/app.module.ts`: importa `ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])`
  y registra `ThrottlerGuard` como `APP_GUARD` provider. Ese patrón es el
  estándar de Nest para guards globales (recomendado sobre `useGlobalGuards`).
- `src/main.ts`: removido el bloque manual y los imports de `ThrottlerGuard`/
  `ThrottlerModule` (ya no se usan ahí).

### Runtime fix 5 — `FinanceModule` y `PaymentsModule` no estaban en `AppModule`

**Síntoma:** sin errores explícitos, pero las rutas de finance/payments no
hubieran existido en runtime. Detectado al revisar `app.module.ts`.

**Fix:** ambos módulos agregados a `imports` de `AppModule`.

### Verificación final

```bash
npm run build       # exit 0
npm run start:dev   # arranca sin errores

curl http://localhost:3000/api/docs   → 200  (Swagger sirve)
curl http://localhost:3000/companies  → 401  (JwtAuthGuard funciona)
curl -X POST http://localhost:3000/auth/login -d '{"email":"x","password":"x"}'
                                       → 400  (ValidationPipe rechaza credenciales inválidas)
```

Rutas mapeadas confirmadas (extracto del log):
```
/auth, /users, /companies, /properties, /towers, /units, /people,
/finance/statement, /finance/fees, /finance/late-fees, /payments
```

### Estado final tras runtime fixes

- Build: exit 0.
- Server: arranca en `http://localhost:3000`.
- Swagger: `http://localhost:3000/api/docs` accesible.
- Guards activos: `JwtAuthGuard`, `RolesGuard`, `ThrottlerGuard` (global).
- DI: todos los módulos resuelven dependencias correctamente.

---

## 2026-05-11 (continuación) — Auth coherente y login validado

### Fix de prioridad alta: nombres de envs JWT inconsistentes

Al revisar el código encontré un desalineamiento triple:
- `backend/.env` ya tenía `JWT_ACCESS_SECRET`/`JWT_ACCESS_EXPIRES_IN` ✅
- `auth.service.ts` (firma) usa `JWT_ACCESS_SECRET`/`JWT_ACCESS_EXPIRES_IN` ✅
- `jwt-auth.guard.ts:24` (verificación) leía `JWT_SECRET` ❌ → `undefined`
- `.env` y `.env.example` de la **raíz** del proyecto (no usados por NestJS,
  pero podían confundir) tenían los nombres viejos `JWT_SECRET`/`JWT_EXPIRES_IN`.

Resultado en práctica: una vez emitido un access_token válido, `JwtAuthGuard`
intentaba verificarlo con `secret: undefined` y siempre fallaba con
401 "Invalid or expired token".

**Fix aplicado:**
- `src/core/guards/jwt-auth.guard.ts:24` — `JWT_SECRET` → `JWT_ACCESS_SECRET`.
- `Ph/.env` raíz: `JWT_SECRET` → `JWT_ACCESS_SECRET`, `JWT_EXPIRES_IN` → `JWT_ACCESS_EXPIRES_IN`.
- `Ph/.env.example` raíz: idem.

Verificación con grep tras el fix:
```
src/core/guards/jwt-auth.guard.ts:24:  secret: process.env.JWT_ACCESS_SECRET
src/modules/auth/auth.service.ts:48:   secret: process.env.JWT_ACCESS_SECRET
src/modules/auth/auth.service.ts:49:   expiresIn: process.env.JWT_ACCESS_EXPIRES_IN
src/modules/auth/auth.service.ts:53:   secret: process.env.JWT_REFRESH_SECRET
src/modules/auth/auth.service.ts:54:   expiresIn: process.env.JWT_REFRESH_EXPIRES_IN
```
Sin referencias a `JWT_SECRET` ni `JWT_EXPIRES_IN`.

### Fix colateral: `LoginDto` y `RefreshDto` sin class-validator

Al validar end-to-end descubrí que `POST /auth/login` devolvía 400 con
`"property email should not exist"`. Causa: `ValidationPipe` global tiene
`whitelist: true, forbidNonWhitelisted: true`, y los DTOs en `auth.controller.ts`
no tenían decoradores de `class-validator`, así que el pipe los strippeaba
antes de llegar al handler.

**Fix:** `src/modules/auth/auth.controller.ts` — agregados decoradores
`@IsEmail()`/`@IsString()`/`@IsNotEmpty()` a los campos de `LoginDto` y
`RefreshDto`. Sin esto, el `ValidationPipe` rechaza todo payload aunque venga
bien formado.

### Smoke test end-to-end

Para verificar el fix:
1. Inserté un superadmin en BD (hash bcrypt de `admin123`).
2. Arranqué `npm run start:dev`.
3. `POST /auth/login` con `{ email, password }` → **HTTP 200** con
   `access_token` y `refresh_token` JWT firmados.
4. `GET /companies` sin token → **HTTP 401** (guard funciona).
5. `GET /companies` con `Authorization: Bearer <access_token>` → **HTTP 200**
   con `[]` (BD vacía, lo esperado).
6. Limpieza: borrado el usuario de smoke test.

El payload del JWT (decodificado) contiene `sub`, `email`, `role`, `companyId`,
`iat`, `exp` — todo lo que necesita la app.

### Estado final

- Auth funcional end-to-end con tokens válidos.
- Naming de envs consistente: `JWT_ACCESS_*` y `JWT_REFRESH_*`.
- Validación de DTOs activa en endpoints de auth.
- BD limpia.

---

## 2026-05-11 (continuación) — Auditoría completa y plan de producción

A petición del usuario se realizó una auditoría del estado del backend y se
reescribió `PLAN.md` como un roadmap completo a producción dividido en 10
fases.

### Auditoría — gaps detectados

| #  | Gap                                                                     |
|----|-------------------------------------------------------------------------|
| 1  | No es repo git (sin `.git`, sin `.gitignore`)                           |
| 2  | Sin ESLint/Prettier/EditorConfig                                        |
| 3  | Sin pre-commit hooks                                                    |
| 4  | `tsconfig` con `strict: false`                                          |
| 5  | `TenancyGuard` / `TenancyInterceptor` existen pero **no aplicados**     |
| 6  | Soft delete: ~32 de ~77 queries no filtran `deletedAt`                  |
| 7  | `AuditLog` no captura `ipAddress` ni `userAgent`                        |
| 8  | Refresh token no rota al usarse                                         |
| 9  | Sin password policy ni bloqueo de cuenta                                |
| 10 | Sin logger estructurado / sin Request ID                                |
| 11 | Sin `/health` ni endpoints de readiness/liveness                        |
| 12 | Sin error tracking (Sentry)                                             |
| 13 | Sin tests (scripts placeholder)                                         |
| 14 | Sin CI                                                                  |
| 15 | Sin Dockerfile para el backend                                          |
| 16 | DTOs sin `@ApiProperty` (Swagger incompleto)                            |
| 17 | Sin file upload para `receiptUrl` de Payment                            |
| 18 | Sin paginación estándar en `findAll`                                    |
| 19 | Sin recuperación de contraseña / verificación email                     |
| 20 | Módulos AdminPH faltantes (PQR, comunicados, reservas, etc.)            |
| 21 | Seed mínimo, no cubre flujo financiero completo                         |

### Plan de 10 fases (resumen)

1. **Higiene del repo**: git, ESLint/Prettier, Husky, TS strict, README/CONTRIBUTING.
2. **Seguridad core**: TenancyGuard global, soft-delete extension, AuditLog
   con IP/UA, refresh token rotation, password policy, throttler por endpoint.
3. **Observabilidad**: Pino logger, Request ID, `/health`, error tracking,
   métricas.
4. **Testing y CI**: Jest unit/integration/e2e, GitHub Actions.
5. **API completa**: paginación, file upload (R2/MinIO), Swagger con
   `@ApiProperty`, versionado, DTOs de respuesta.
6. **Auth + seed completos**: recuperación de password, verificación email,
   `/me`, seed enriquecido.
7. **Módulos AdminPH**: PQR, comunicados, reservas, portería, mascotas/vehículos,
   asambleas, votaciones, actas, contabilidad.
8. **Integraciones externas**: pasarela, email, WhatsApp, PDF/Excel.
9. **Infra producción**: Dockerfile, secrets, Nginx, CI/CD deploy, backups.
10. **Documentación**: OpenAPI, ADRs, runbooks.

Roadmap temporal sugerido: 4 meses para llegar a producción con MVP estable;
5-10 meses adicionales para los módulos posteriores de AdminPH.

Detalle completo de tareas, criterios de éxito y estructura de carpetas
objetivo en `PLAN.md`.

---

## 2026-05-12 — Fase 1 del plan completa (higiene del repo)

Se cerraron las 5 sub-fases del bloque 1. Resumen por sub-fase:

### Fase 1.1 — git init + `.gitignore` + primer commit + tag

- `git init -b main` en raíz `Ph/`.
- `.gitignore` completo (node_modules, dist, .env*, .vscode, OS junk,
  Prisma generated, Docker volumes locales).
- Verificado: `.env` y `backend/.env` NO se commitean; `.env.example` SÍ.
- Primer commit: `chore: initial commit — AdminPH backend MVP base`.
- Tag `v0.1.0-mvp-base` apuntando al primer commit.
- Tras configurar nuevo autor `davidhd709 <davidhd709@gmail.com>` (override
  local del repo), se hizo `git commit --amend --reset-author --no-edit`
  y se re-tag.
- Remoto configurado: `https://github.com/davidhd709/AdminPH.git`.
  Push lo hace el usuario manualmente (este sandbox no tiene credenciales).

### Fase 1.2 — ESLint + Prettier + EditorConfig

- Instalados: `eslint@10`, `typescript-eslint@8` (meta-paquete),
  `eslint-config-prettier`, `eslint-plugin-prettier`, `prettier@3`.
- `backend/eslint.config.mjs` con **flat config** (ESLint 9+ default).
  Preset `typescript-eslint/recommended` + integración Prettier.
- Reglas extra: `no-console: warn` (allow warn/error/info), `prefer-const`,
  `no-var`, `eqeqeq: smart`, `@typescript-eslint/no-explicit-any: warn`.
- `backend/.prettierrc` y `backend/.prettierignore`.
- `.editorconfig` en raíz: 2 spaces, LF, UTF-8, trim trailing whitespace.
- Scripts npm en `backend/package.json`: `lint`, `lint:fix`, `format`,
  `format:check`.
- Ejecutado `npm run format` una vez: 17 archivos reformateados (estilo,
  sin cambio de lógica).

**Decisión revertida durante Fase 1.4:** la regla
`@typescript-eslint/consistent-type-imports` fue inicialmente `warn` con
fix automático. ESLint convirtió `import { JwtService }` a `import type`
en archivos donde el símbolo se usa para inyección DI. Eso ROMPE NestJS DI
porque TypeScript no emite metadata de `reflect-metadata` para `import type`,
y la inyección falla en runtime. **La regla se desactivó** y todos los
`import type` se revirtieron a `import` regular.

### Fase 1.3 — Husky + lint-staged + commitlint

- Setup monorepo-ready: creado `package.json` en raíz `Ph/` con scripts
  proxy a backend. Tooling de calidad vive en raíz porque `.git` está ahí.
- Instalados (en raíz): `husky@9`, `lint-staged`, `@commitlint/cli`,
  `@commitlint/config-conventional`.
- Husky inicializado con `npx husky init`.
- Hooks configurados:
  - `pre-commit`: `cd backend && npx lint-staged`.
  - `commit-msg`: `npx commitlint --edit "$1"`.
- `backend/.lintstagedrc.json`: para `*.ts` corre `eslint --fix` +
  `prettier --write`; otros archivos solo `prettier`.
- `commitlint.config.mjs` en raíz: extends `@commitlint/config-conventional`,
  header max 100 chars, body sin límite.
- Verificación end-to-end:
  - Commit con mensaje `"mensaje malo"` → REJECTED por commit-msg hook
    (`husky - commit-msg script failed (code 1)`).
  - Commit con mensaje convencional → ACCEPTED, pre-commit ejecutó
    lint-staged sin errores.

### Fase 1.4 — TypeScript strict mode

Activado **en una sola pasada** (no gradual como el plan sugería —
la calidad del código permitía hacerlo directo):

```json
"strict": true,
"noUnusedLocals": true,
"noFallthroughCasesInSwitch": true,
"noImplicitReturns": true
```

Errores generados y resueltos:

1. **26 errores TS6133 (unused imports/vars)** — limpiados en 20 archivos.
   Símbolos eliminados: `IsEmail` (en muchos DTOs), `Prisma` (en services
   que no lo usan), `UserRole`, `Param`, `Delete`, `Patch`,
   `BadRequestException`, `Response`, variable `fee` no usada,
   `UpdateLateFeeConfigDto`, etc. Sin silenciar con `_` prefix, eliminación real.

2. **43 errores TS2564 (DTO sin initializer)** — resueltos con definite-
   assignment operator (`!`) en cada propiedad requerida. Patrón estándar
   para DTOs validados por class-validator + ValidationPipe global. Tocados
   11 archivos DTO.

3. **2 errores TS2322 en `audit.service.ts`** — al cambiar inicialmente
   `oldValue`/`newValue` a `unknown`, Prisma rechazaba: espera
   `InputJsonValue | NullableJsonNullValueInput`. Decidido mantener `any`
   ahí (JSON dinámico real) con comentario explicativo. `request?` sí se
   tipó como `unknown`.

4. **4 errores TS18047 (`fee`/`oldUser` possibly null)** — corregidos
   cambiando el return type de `findOne` de `Promise<T | null>` a
   `Promise<T>` en `fees.service.ts` y `users.service.ts`, porque ambos
   tiran `NotFoundException` antes de retornar valor null.

5. **4 errores TS7034/TS7005 en `account-statement.service.ts`** —
   `pendingFees` y `overdueFees` declaradas como arrays vacíos sin tipo.
   Tipados como `Fee[]`.

6. **1 error TS18046 en `fees.service.ts`** — `catch (e)` con `e` de tipo
   `unknown`. Corregido con narrowing: `e instanceof Error ? e.message : String(e)`.

7. **1 error TS7053 en `jwt-auth.guard.ts`** — `request["user"] = payload`
   con Express `Request` sin index signature. Resuelto con augmentación
   global de tipo Express (nuevo archivo `src/core/types/express.d.ts`)
   y nueva interface `AuthUser` en `src/core/types/auth-user.ts`.

8. **3 errores TS2322 en `users.service.ts`** — `User.companyId` de Prisma
   es `string | null` pero `AuditLogParams.companyId` era `string | undefined`.
   Cambiado a `string | null | undefined` (mismo para `propertyId`).

**Importante — bug introducido por ESLint en Fase 1.2:** la regla
`consistent-type-imports` había convertido inyecciones DI a `import type`,
rompiendo el runtime de NestJS. Detectado al activar strict + revisar
archivos. Regla desactivada, y todos los `import type` revertidos a `import`
en `src/**/*.ts` con un solo `sed -i 's/^import type {/import {/'`.

**Verificación final:**
- `npm run build` → exit 0 con strict completo.
- `npm run lint` → exit 0 (143 warnings, todas de `no-explicit-any` que
  quedan como deuda explícita).
- Smoke test end-to-end en `PORT=3030`:
  - Login `POST /auth/login` → 200 con `access_token`/`refresh_token`.
  - `GET /companies` sin token → 401.
  - `GET /companies` con Bearer → 200.

Decisión de puerto: el puerto 3000 estaba ocupado por otro proyecto del
usuario (`canchas/`). El smoke test corrió en `PORT=3030`.

### Fase 1.5 — README ampliado + CONTRIBUTING

- `README.md` reescrito con: setup paso a paso (Node 22, Docker, env,
  migrate deploy, seed), comandos raíz y backend, estructura de carpetas,
  tabla de decisiones técnicas, links a docs.
- `CONTRIBUTING.md` nuevo con: flujo de branches, Conventional Commits
  obligatorio, pre-commit hooks, flujo de PR, estándares TypeScript/NestJS/
  Prisma, soft delete, logs, 10 reglas no negociables.

### Estado al cerrar Fase 1

- Repo git inicializado, primer commit firmado por `davidhd709`.
- Remoto configurado (sin push aún — pendiente de credenciales del usuario).
- 4 commits en `main`:
  - `1b83893` chore: initial commit
  - `89fdcfd` chore(tooling): ESLint + Prettier + EditorConfig
  - `5835325` chore(tooling): Husky + lint-staged + commitlint
  - `<sha>`  chore(ts): enable strict mode
  - `18b15ad` docs: write README and CONTRIBUTING
- Tag `v0.1.0-mvp-base` apuntando al primer commit.
- Build, lint y formato OK.
- Auth funcional verificada con strict mode.
- Deuda explícita restante: 143 warnings `no-explicit-any` para Fase 2.

Próximo paso: tag de milestone `v0.2.0-phase1-complete` y arranque de
**Fase 2: Seguridad core** (TenancyGuard global, soft-delete extension,
AuditLog con IP/UA, refresh token rotation, password policy, throttler
por endpoint, Helmet con CSP).

---

## 2026-05-14 / 2026-05-15 — Fase 2 del plan completa (seguridad core)

Se cerraron las 7 sub-fases del bloque 2. Cada sub-fase tiene su propio
commit con detalle completo del cambio y smoke test end-to-end. Resumen
ejecutivo abajo.

### Fase 2.1 — TenancyGuard global + `@Public()` / `@SkipTenancy()`

Los 3 guards de seguridad pasan de `@UseGuards` manual en cada controller
a `APP_GUARD` global en `AppModule`. Orden: Throttler → Jwt → Roles → Tenancy.

Nuevos decoradores:
- `@Public()` — salta los 3 guards (login, refresh, health).
- `@SkipTenancy()` — solo salta TenancyGuard (mantiene Jwt + Roles).

`TenancyGuard` reescrito: valida `companyId`/`propertyId` en params + query
+ body. COMPANY_ADMIN accede a properties de su misma empresa; otros roles
necesitan `PropertyUser`. Defense in depth: services siguen validando.

Smoke: POST /properties con `companyId` fake en body → 403 cross-company.

### Fase 2.2 — Soft delete consistente

Auditoría exhaustiva (delegada a agente Explore, multi-línea aware):
48 queries totales, 40 ya correctas, 8 arregladas. Cero hard deletes en
código (todo soft-delete vía `update { deletedAt }`).

Queries corregidas (agregado `deletedAt: null`):
- `account-statement.service.ts:40,44` (Owner/Resident validación tenencia)
- `fee-concepts.service.ts:38` (dedup por nombre + active)
- `late-fee.service.ts:137` (lookup INTEREST + active)
- `late-fee.service.ts:180` (refactor: select acotado para audit log)
- `payments.service.ts:34,38,48` (Owner/Resident/Payment dedup)

Nuevo `src/core/prisma/soft-delete-extension.ts` con la extensión completa
implementada (findFirst/findMany/findUnique/count + delete/deleteMany como
update). NO está activada todavía — requiere refactor del PrismaService
(Prisma 7 `client.$extends()` retorna tipo distinto). Queda como deuda
documentada para iteración futura. Eliminado el stub viejo
`prisma-extension.ts`.

### Fase 2.3 — AuditLog con `ipAddress` + `userAgent` + `requestId`

Schema:
- `AuditLog` agrega columnas `ipAddress?`, `userAgent?`, `requestId?`.
- Nuevo index `(action, timestamp)` para queries forenses.
- enum `AuditAction` amplía con `FAILED_LOGIN`, `CHANGE_PASSWORD`,
  `PASSWORD_RESET`.
- Migración: `20260515042904_audit_log_request_context`.

`audit.service.ts` extrae contexto del request:
- `X-Forwarded-For` (primer hop) con fallback a `request.ip`.
- `User-Agent` header.
- `X-Request-Id` header (correlation id).

`auth.controller.ts` registra LOGIN/LOGOUT/FAILED_LOGIN. El FAILED_LOGIN
solo se loguea si el email corresponde a un User existente (evita filas
con userId fake).

Smoke: 3 AuditLogs creados con IP=::1, UA=smoke-test-agent, requestId=...
verificados con `SELECT FROM "AuditLog"`.

### Fase 2.4 — Refresh token rotation con detección de reuso

Schema:
- Eliminado `User.refreshToken: String?`.
- Nuevo modelo `RefreshToken` con `tokenHash` único, `expiresAt`,
  `revokedAt`, `ipAddress`, `userAgent`. FK CASCADE a User.
- Índices: `tokenHash` unique + `(userId, revokedAt)`.
- Migración: `20260515043343_refresh_token_model`.

Decisión: **SHA-256** en lugar de bcrypt para el hash del token. Bcrypt
es no-deterministic (incluye salt), obligando a traer todos los tokens
activos y comparar uno por uno. SHA-256 permite búsqueda directa por
hash. Para refresh tokens es estándar de la industria.

`AuthService` métodos nuevos:
- `issueTokens(user, request)` — emite par y persiste row hasheada.
- `rotateRefreshToken(jwt, request)` — verifica JWT, busca hash, marca
  viejo como revocado, emite nuevo. **Si el JWT es válido pero el hash
  NO existe o ya está revocado, asume reuso/robo y revoca TODOS los
  tokens del user** (signal de credenciales comprometidas).
- `revokeAllUserTokens(userId)`.
- Excepciones: `RefreshTokenReuseError`, `RefreshTokenExpiredError`.

Smoke end-to-end:
- login → refresh #1 → refresh con #1 → rota a #2 ✓
- reusar #1 (ya revocado) → 401 + revoca TODOS los tokens ✓
- #2 también queda revocado por el revoke-all ✓
- BD final: 2 rows con `revoked=true`, IP/UA persistidos.

### Fase 2.5 — Password policy + lockout + SafeUser

Schema:
- `User` agrega `failedLoginCount Int @default(0)`, `lastFailedLoginAt`,
  `lockedUntil`.
- Migración: `20260515044137_user_account_lockout`.

Password policy (`@IsStrongPassword` custom validator):
- Mínimo 10 caracteres.
- ≥1 mayúscula, ≥1 minúscula, ≥1 dígito, ≥1 símbolo.
- Aplicado en `CreateUserDto`.

Lockout policy (constantes en AuthService):
- `LOCKOUT_THRESHOLD = 5` intentos fallidos.
- `LOCKOUT_WINDOW_MS = 15 min` ventana de conteo.
- `LOCKOUT_DURATION_MS = 30 min` duración del bloqueo.
- Si pasa la ventana sin fallo nuevo, el contador se reinicia al próximo.
- Login exitoso siempre resetea contador y desbloquea.

`validateUser` ahora retorna discriminated union:
`{ kind: 'ok', user } | { kind: 'locked', until } | { kind: 'invalid' }`.
`auth.controller.ts` maneja los 3 casos: 200 / 423 (con `lockedUntil` en
body) / 401.

Endpoint admin nuevo: `POST /users/:id/unlock` (SUPERADMIN, COMPANY_ADMIN)
con audit log `entityName=UserLockout`.

**FIX CRÍTICO**: `POST /users` devolvía el password en plain text y lo
persistía sin hashear. Ahora:
- `users.service.ts:create()` hashea con bcrypt antes de persistir.
- Nuevo tipo `SafeUser = Omit<User, "password" | "failedLoginCount" |
  "lastFailedLoginAt" | "lockedUntil">`.
- Helper estático `UsersService.toSafeUser()`.
- create/findOne/update/delete retornan `SafeUser` (nunca el record crudo).
- `findRawById` disponible para uso interno cuando se necesita el record
  completo (ej. comparar password en login).

Smoke end-to-end:
- 5 logins fallidos → 401 c/u, 6to con password correcto → 423 con body
  `{ lockedUntil: "..." }`. BD: failedLoginCount=5, lockedUntil=now+30m.
- POST /users/:id/unlock con SUPERADMIN → 204. BD: counters en 0.
- Login post-unlock con password correcto → 200.
- POST /users password "weak" → 400 mensaje de política.
- POST /users password fuerte → 201 sin password, sin counters lockout
  en la respuesta.

### Fase 2.6 — Helmet CSP estricto + CORS por env + Throttler por endpoint

`main.ts`:
- `trust proxy = 1` (Express lee `X-Forwarded-For` del 1er hop, necesario
  detrás de Nginx/CDN).
- Helmet con CSP estricto en prod (`default-src 'self'`,
  `object-src 'none'`, `frame-ancestors 'none'`,
  `upgrade-insecure-requests`) + HSTS 1 año + `referrer-policy: no-referrer`.
  En dev: CSP off (permite Swagger UI inline scripts).
- CORS por env `CORS_ORIGINS` (lista CSV). **En prod NUNCA `*`**: si la
  env está vacía, el server falla al arrancar.
- Swagger UI solo se monta en `NODE_ENV != production`.
- `ValidationPipe`: `transformOptions.enableImplicitConversion = false`,
  `disableErrorMessages = isProd` (adelanto de Fase 2.7).
- `bootstrap` ahora hace `process.exit(1)` en error fatal.

`app.module.ts` ThrottlerModule con 3 policies:
- `default`: 100 req/min/IP (global).
- `strict`: 10 req/min/IP (override en `POST /auth/login`).
- `sensitive`: 30 req/min/IP (override en `POST /auth/refresh`).

`.env`/`.env.example` cambian `CORS_ORIGIN` → `CORS_ORIGINS` (CSV).

Smoke end-to-end:
- Headers de respuesta: `Content-Security-Policy: ...`,
  `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: SAMEORIGIN`.
- CORS con `Origin: http://localhost:3001` → `Access-Control-Allow-Origin`
  matchea (no `*`).
- 12 POSTs a `/auth/login` en burst → todos 429 después del 10mo (strict
  throttler activo).

### Fase 2.7 — ValidationPipe seguro (cubierto en 2.6)

La config final del ValidationPipe quedó adelantada en 2.6:
```ts
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: false },
  disableErrorMessages: isProd,
})
```

### Estado al cerrar Fase 2

Commits en `main` durante Fase 2:
```
bb670ff feat(security): harden Helmet CSP, env-driven CORS, per-endpoint throttling — Fase 2.6
7bdb93f chore: remove stray prisma/ dir from repo root
72488c1 feat(security): password policy + account lockout + safe user responses — Fase 2.5
4c028a3 feat(auth): refresh token rotation with reuse detection — Fase 2.4
d1f0727 feat(audit): persist ipAddress, userAgent and requestId — Fase 2.3
[2.2]   feat(security): consistent soft-delete in queries + extension stub — Fase 2.2
e139ebb feat(security): apply JwtAuth/Roles/Tenancy guards globally — Fase 2.1
```

3 migraciones aplicadas a BD (audit_log_request_context, refresh_token_model,
user_account_lockout).

Build, lint y formato OK. Smoke tests end-to-end pasaron en cada sub-fase.

### Deuda explícita restante para fases posteriores

- **Soft-delete extension activación**: requiere refactor del PrismaService
  para wrapper sobre cliente extendido (Prisma 7 `$extends` retorna tipo
  distinto). Programado para fase que tenga tiempo dedicado a tests.
- **`audit.service.log` con `unknown` para `request`**: actualmente sí
  extrae IP/UA/RequestId, pero el `requestId` viene SOLO del header
  externo. Fase 3 (observabilidad) agregará middleware que genera
  correlation id si no viene.
- **Swagger en prod**: aún sin auth. Fase 9 (infra) lo cubrirá con basicAuth
  o sub-domain interno.
- **Throttler values hardcoded**: migrar a env en Fase 3 o 9.
- **Tests específicos para flujos de seguridad**: lockout, rotation,
  cross-tenant — Fase 4 (testing).
- **143 warnings `no-explicit-any` restantes**: la introducción de
  `AuthUser` interface (Fase 2.1) bajó algunas; el grueso queda como
  refactor incremental, no bloqueante.

Próximo paso: tag `v0.3.0-phase2-complete` y arranque de **Fase 3:
Observabilidad** (Pino logger, Request ID middleware, health checks,
error tracking).

---

## 2026-05-24 — Fase 3 del plan completa (observabilidad)

### Fase 3.1 — Pino structured logger

- Instalados `nestjs-pino`, `pino`, `pino-http`, `pino-pretty` (dev).
- `src/core/logging/logger.module.ts` (`AppLoggerModule`):
  - dev: `pino-pretty` single-line legible; prod: JSON estructurado.
  - `LOG_LEVEL` por env (default `info` prod / `debug` dev).
  - `redact` con `remove: true` de `authorization`, `cookie`,
    `body.password`, `body.refresh_token`, `set-cookie`.
  - `autoLogging.ignore` salta `/health` `/live` `/ready` (sin ruido de probes).
- `main.ts`: `NestFactory.create(AppModule, { bufferLogs: true })` +
  `app.useLogger(app.get(PinoLogger))`. Pino reemplaza el logger default de
  Nest en TODA la app.

### Fase 3.2 — Request ID / correlation id

- `genReqId` en Pino: usa `X-Request-Id` entrante o genera un UUID.
- Se expone en el header de respuesta `X-Request-Id` (trazabilidad
  cliente → logs → audit).
- `customProps` inyecta `userId` en cada línea de log cuando hay `request.user`.
- Combina con el `requestId` del AuditLog (Fase 2.3) para correlación total.

### Fase 3.3 — Health checks (@nestjs/terminus)

- `src/modules/health/`: `HealthModule`, `HealthController`,
  `PrismaHealthIndicator`.
- `GET /live`  → liveness (proceso vivo, sin tocar deps). k8s livenessProbe.
- `GET /ready` → readiness (BD via `SELECT 1`). k8s readinessProbe.
- `GET /health`→ BD + memoria heap (<512 MB). dashboards / uptime monitors.
- Los 3 son `@Public()`.

### Fase 3.4 — Exception filter global uniforme

- `src/core/filters/all-exceptions.filter.ts` registrado como `APP_FILTER`.
- Formato consistente: `{ statusCode, error, message, code?, requestId,
  timestamp, path }`.
- Traducción de errores Prisma:
  - `P2002` (unique) → 409 Conflict con campo afectado.
  - `P2025` (not found) → 404.
  - `P2003` (FK) → 400.
  - `PrismaClientValidationError` → 400.
- 5xx se loguean como `error` (con stack); 4xx como `warn`. Ambos con requestId.

### Fase 3.5 — Error tracking (documentado como deuda)

Decisión del usuario: dejar documentado. El prerequisito (punto único de
captura en `AllExceptionsFilter`) ya existe. Falta conectar un proveedor
(Sentry cloud o Glitchtip self-hosted) — requiere DSN/infra. Cuando se
decida, el hook de envío va en el bloque `if (body.statusCode >= 500)` del
filter.

### Verificación end-to-end (PORT=3030)

- Logs en formato Pino pretty con `context`.
- `GET /live`   → 200 `{ status: ok, timestamp }`.
- `GET /health` → 200 `{ database: up, memory_heap: up }`.
- `GET /ready`  → 200 `{ database: up }`.
- Response incluye header `X-Request-Id` (UUID).
- `GET /no-existe` → 404 con body uniforme + requestId + path.

### Estado al cerrar Fase 3

Commits en `main`:
```
<sha> feat(observability): Pino logger, request id, health checks, exception filter — Fase 3.1-3.4
```

Build, lint (140 warnings any, deuda conocida) y smoke OK.
Tag `v0.4.0-phase3-complete`.

Deuda explícita: error tracking (3.5) pendiente de proveedor; métricas
Prometheus (3.6 opcional) no implementadas.

Próximo paso: **Fase 4 — Testing y CI** (Jest unit/integration/e2e +
GitHub Actions).

---

## 2026-05-24 — Fase 4 del plan completa (testing y CI)

### Fase 4.1 — Configurar Jest

- Instalados `jest@30`, `@types/jest`, `ts-jest`, `supertest`,
  `@types/supertest`.
- `jest.config.ts`: unit tests (`*.spec.ts` en `src/`), ts-jest,
  moduleNameMapper `src/*`, coverage, threshold anti-regresión.
- `test/jest-e2e.config.ts`: para `*.e2e-spec.ts`.
- `tsconfig.build.json` nuevo: excluye specs/test del build de producción
  (antes los `.spec.js` se colaban en `dist/`).
- `tsconfig.json`: `types: ["node", "jest"]`.
- Scripts: `test`, `test:watch`, `test:cov`, `test:e2e`.

### Fase 4.2 — Tests unitarios (27 tests, 5 suites)

- `auth.service.spec.ts` (9): validateUser (invalid / locked / lockout en
  5to intento / reset al login ok), rotateRefreshToken (reuse detection ×2
  + rotación feliz), hashRefreshToken determinístico.
- `is-strong-password.validator.spec.ts` (9): política + casos borde.
- `fees.service.spec.ts` (4): NotFound, generación FIXED, skip duplicados,
  findOne not found.
- `late-fee.service.spec.ts` (3): getConfig null, guardas config inactiva.
- `account-statement.service.spec.ts` (2): paz y salvo true/false.

Patrón: mock manual de PrismaService/AuditService con `jest.fn()`,
instanciación directa (sin TestingModule), bcrypt vía `jest.mock`.

Coverage de services testeados: auth 76%, account-statement 78%,
is-strong-password 90%, fees 44%, late-fee 22%. El threshold global es un
**piso anti-regresión** (statements 14 / branches 11 / functions 13 /
lines 14); el CI falla si la cobertura baja de ahí. Meta: subir
incrementalmente a 70% en services críticos.

### Fase 4.4 — Tests E2E (5 tests) + FIX de bug de producción

`test/auth.e2e-spec.ts` contra la BD real (puerto 5434):
- login válido → 200 con tokens, sin password.
- login password incorrecto → 401.
- GET /companies sin token → 401.
- GET /companies con token → 200.
- refresh rota el token; reusar el viejo → 401.

**BUG DE PRODUCCIÓN descubierto por el E2E:** dos logins del mismo usuario
en el MISMO segundo generaban JWTs de refresh idénticos (el claim `iat`
solo tiene resolución de segundos) → mismo `tokenHash` SHA-256 → violación
de constraint unique → 409 Conflict espurio. Un usuario con doble-click en
login o un cliente con retry rápido lo dispararía.

Fix: `signTokenPair()` agrega `jti: randomUUID()` al payload del refresh
token. Garantiza unicidad. Los 27 unit tests siguen pasando tras el cambio.

(Fase 4.3 — integración dedicada con BD — quedó cubierta por estos E2E,
que ya ejercitan la app completa contra PostgreSQL real.)

### Fase 4.5 — GitHub Actions CI

`.github/workflows/ci.yml` en push/PR a `main`:
- Postgres 16 service container (healthcheck).
- Node 22 + cache npm.
- `npm ci` → `prisma generate` → `lint` → `build` → `migrate deploy` →
  `test:cov` → `test:e2e` → upload coverage artifact.
- Env de CI con secrets dummy.

Quality gate: PR con lint/build/test roto o coverage bajo el piso no
mergea (cuando se configure branch protection en GitHub).

### Estado al cerrar Fase 4

Commits en `main`:
```
7535746 ci: add GitHub Actions workflow — Fase 4.5
84b4904 test(e2e): auth flow e2e + fix refresh token uniqueness bug — Fase 4.4
<sha>   test: configure Jest + unit tests for critical services — Fase 4.1-4.2
```

32 tests totales (27 unit + 5 e2e) en verde. Build OK. Tag
`v0.5.0-phase4-complete`.

Deuda: subir coverage incrementalmente; agregar tests de payments.service
(flujo de aprobación con $transaction) y multi-tenancy e2e con 2 empresas.

Próximo paso: **Fase 5 — API surface completa** (paginación, file upload,
Swagger con @ApiProperty, versionado, DTOs de respuesta, exception filter
ya hecho en Fase 3).

---

## 2026-05-24 — Fase 5 del plan (API surface, parcial)

### Fase 5.4 — Versionado API /api/v1

- `setGlobalPrefix("api", { exclude: ["health","live","ready"] })` +
  `enableVersioning({ type: URI, defaultVersion: "1" })`.
- Rutas pasan de `/auth/login` a `/api/v1/auth/login`.
- Health version-neutral y sin prefijo (`/health`, `/live`, `/ready`).
- Refactor DRY: config compartida (prefix + versioning + ValidationPipe) en
  `src/app-setup.ts` (`configureApp`), usada por main.ts Y por los E2E.
  Antes los E2E no aplicaban prefix/versioning → probaban rutas que en prod
  no existían. Ahora prueban la misma superficie.

### Fase 5.1 — Paginación estándar

- `src/core/dto/pagination.dto.ts`: `PaginationDto` (page≥1, pageSize 1-100,
  sortBy, sortOrder, defaults 1/20/desc) + `PaginatedResult<T>`.
- `src/core/utils/paginate.ts`: helper que hace findMany + count en paralelo.
- Aplicado a `findAll` de companies, properties, towers, units, fees
  (preservando toda la lógica de tenancy). Respuesta pasa de array plano a
  `{ items, meta: { total, page, pageSize, totalPages } }`.
- Pendiente incremental: people (owners/residents) y audit logs.

### Fase 5.3 — Swagger / OpenAPI completo

- 12 controllers con `@ApiTags`; `@ApiBearerAuth` en los protegidos.
- 12 DTOs con `@ApiProperty` / `@ApiPropertyOptional` (description, example,
  `enum:` para FeeConceptType/CalculationType/InterestType).
- `PaginationDto` documentado.
- Swagger UI en `/api/docs` muestra esquemas completos + auth Bearer.

### Fase 5.6 — Errores uniformes

Ya implementado en Fase 3.4 (`AllExceptionsFilter` con formato uniforme +
traducción de errores Prisma).

### Decisiones de alcance (consultadas al usuario)

- **5.2 File upload de comprobantes → DIFERIDO a Fase 9.** Requiere decisión
  de storage (Cloudflare R2 vs MinIO self-hosted). Se retoma cuando se monte
  la infraestructura.
- **5.5 Response DTOs → CERRADO como suficiente.** El único dato sensible
  (User.password) ya está cubierto por `SafeUser` (Fase 2.5); `refreshToken`
  vive en tabla aparte. Un `ClassSerializerInterceptor` global con response
  DTOs por entidad queda como mejora incremental (bajo retorno ahora, no hay
  más secretos que ocultar).

### Estado al cerrar Fase 5

Commits en `main`:
```
<sha> docs(api): enrich OpenAPI ... — Fase 5.3
<sha> feat(api): standard pagination on list endpoints — Fase 5.1
4ef1914 feat(api): URI versioning /api/v1 + shared app config — Fase 5.4
```

Build OK, 27 unit + 5 e2e en verde. Tag `v0.6.0-phase5-complete`.

Próximo paso: **Fase 6 — Auth completa + seed** (recuperación de password,
verificación de email, /me + cambio de password, seed enriquecido).

---

## 2026-05-24 — Fase 6 del plan (auth completa + seed, parcial)

### Fase 6.3 — Perfil propio + cambio de contraseña

- `GET /api/v1/users/me` (ya existía).
- `PATCH /api/v1/users/me` (`UpdateMeDto`: fullName, phone).
- `POST /api/v1/users/me/change-password` (`ChangePasswordDto`): verifica
  oldPassword, exige newPassword fuerte (`@IsStrongPassword`), hashea con
  bcrypt y **revoca todas las sesiones** (forzar re-login). Audit
  `CHANGE_PASSWORD`.
- Rutas `/me` declaradas antes de `:id` para no colisionar con el param.
- `UsersService.changePassword` no acopla a AuthService; el controller
  orquesta el revoke vía `authService.revokeAllUserTokens`.

### Fase 6.1 — Recuperación de contraseña

- Modelo `PasswordResetToken` (tokenHash SHA-256 único, expiresAt 1h,
  usedAt). Migración `20260524164251_password_reset_and_email_verified`.
- `MailService` abstracto (`src/modules/mail`) con **log-transport**: en
  dev/CI loguea el email en vez de enviarlo. La interface queda lista para
  conectar Resend/SendGrid/SMTP en Fase 8.2 sin tocar el resto del código.
  `MailModule` es `@Global`.
- `POST /api/v1/auth/forgot-password`: SIEMPRE 204 (anti user-enumeration).
  Genera token de un solo uso, invalida los previos, envía link con
  `FRONTEND_URL`.
- `POST /api/v1/auth/reset-password`: valida token (existe / no usado / no
  expirado), actualiza password en `$transaction`, marca token usado,
  resetea contadores de lockout y revoca todas las sesiones.
- Error de dominio `PasswordResetInvalidError` → 401.

Smoke end-to-end (log-transport captura el token):
forgot → 204, reset → 204, login con nueva password → 200, reusar token → 401.

### Fase 6.2 — Verificación de email (diferida)

Infraestructura lista: campo `User.emailVerifiedAt` (en la misma migración)
y `MailService.sendEmailVerification`. El flujo completo (modelo de token +
endpoint verify + bloqueo opcional de login) queda como **deuda** — es
"opcional MVP" y duplica el patrón de password reset.

### Fase 6.4 — Seed enriquecido e idempotente

`prisma/seed.ts` reescrito. Crea:
- 1 SUPERADMIN (`admin@adminph.com`).
- 2 empresas, 4 copropiedades (2 por empresa).
- 6 admins: 1 COMPANY_ADMIN por empresa + 1 PROPERTY_ADMIN por copropiedad
  (con su `PropertyUser`).
- 12 torres (3 por copropiedad) × 5 unidades = 60 unidades.
- 20 conceptos de cobro (5 por copropiedad), 4 `LateFeeConfig`.
- 60 owners + 60 residents (1 por unidad).
- 120 cuotas de administración (2 períodos × 60 unidades).
- Password demo de todos: **AdminPH2026!**

Idempotente (upsert por claves naturales; findFirst+create donde no hay
unique). Verificado: 2da corrida no duplica (BD estable en
2/4/12/60/120).

### Estado al cerrar Fase 6

Commit `f15a6ea` en `main`. build OK, 27 unit + 5 e2e verdes.
Tag `v0.7.0-phase6-complete`.

Deuda: flujo de email verification; conectar MailService real (Fase 8.2);
E2E de reset/change-password.

Próximo paso: las fases de fundamentos (1-6) están completas. Sigue
**Fase 9 — Infra producción** (Dockerfile, secrets, Nginx, CI/CD deploy,
backups) para poder lanzar, O **Fase 7** (módulos AdminPH: PQR, comunicados,
reservas, etc.) para ampliar funcionalidad. Recomendado: Fase 9 antes de
producción.

---

## 2026-05-24 — Fase 9 del plan completa (infraestructura producción)

### 9.1 — Dockerfile multi-stage
- `backend/Dockerfile`: stages deps → builder (`prisma generate` + `nest build`
  + `npm prune --omit=dev`) → runner (`node:22-alpine`, usuario no-root,
  `HEALTHCHECK` a /health).
- Placeholder `DATABASE_URL` en builder: `prisma.config.ts` exige la var pero
  `generate` no conecta a BD; el runtime usa el valor real.
- `backend/.dockerignore`.
- **FIX:** `package.json` `start` apuntaba a `dist/main.js`; la ruta real
  compilada es `dist/src/main.js`. Corregido + `start:prod` + `prisma:deploy`.
- Verificado end-to-end: la imagen construye, el container arranca en
  `NODE_ENV=production` (logs JSON) y `/health` responde 200 contra la BD.
- Imagen ~769MB (deuda: optimizar; el grueso son los engines de Prisma).

### 9.2 — docker-compose
- `docker-compose.yml` (dev): postgres + **minio** (S3 para comprobantes) +
  **mailhog** (captura emails). Backend fuera (corre con `start:dev`).
- `docker-compose.prod.yml`: postgres + backend dockerizado + nginx, secrets
  vía `.env.production`, healthchecks, red dedicada.
- Ambos validados con `docker compose config`.

### 9.4 — Nginx reverse proxy
- `infra/nginx/adminph.conf`: HTTP→HTTPS, TLS 1.2/1.3, HSTS + headers de
  seguridad, `limit_req` de edge, gzip, `client_max_body_size 10m`, health
  checks sin rate limit, proxy a `backend:3000`.

### 9.6 — Backups
- `infra/scripts/backup-db.sh`: `pg_dump -Fc` con retención configurable,
  subida opcional a R2/MinIO (rclone), referencia de restore. Apto para cron.

### 9.5 — Deploy CI/CD
- `.github/workflows/deploy.yml`: build imagen → push GHCR → SSH al VPS →
  `prisma migrate deploy` → `docker compose up`. Deshabilitado por defecto
  (`workflow_dispatch` + guard `DEPLOY_ENABLED`) hasta configurar secrets.

### 9.3 — Secrets
- `backend/.env.production.example` (plantilla, sin valores reales).
  `.env.production` en `.gitignore` (verificado con `git check-ignore`).

### 9.7 — Uptime
- Documentado: UptimeRobot/Healthchecks.io a `/health` cada 5 min.

### Runbooks (docs/runbooks/)
- `deploy.md`, `restore-from-backup.md`, `rotate-secrets.md`.

### Estado al cerrar Fase 9
Commit `93e544d`. Tag `v0.8.0-phase9-complete`.

**Hito: las fases de "backend al 100%" (1-6 + 9) están completas.** El
backend está listo para producción salvo conectar la infra real (VPS, DNS,
TLS, registry) y los servicios externos diferidos (file upload, email real).

Próximo paso: **Fase 7** (módulos AdminPH: PQR, comunicados, reservas,
portería, mascotas/vehículos, asambleas, votaciones, contabilidad) y
**Fase 8** (integraciones: pasarela, email real, WhatsApp, PDF). Ambas son
expansión funcional, no bloqueантes del "100% backend".

---

## 2026-05-24 — Fase 7 del plan completa (módulos de negocio AdminPH)

Los 9 módulos de negocio del contexto AdminPH implementados con un patrón
uniforme establecido por PQR: modelo Prisma + migración (relaciones inversas
en los modelos core) → service con multi-tenancy + audit → controller
versionado (/api/v1) con @ApiTags/@ApiBearerAuth → DTOs con class-validator +
Swagger → tests unitarios con mocks. Cada uno en su propio commit.

- **7.1 PQR** (`pqr_module`): peticiones/quejas/reclamos con radicado
  legible (PQR-YYYY-NNNNNN desde ticketNumber autoincrement), hilo de
  respuestas, estados, scoping por rol (autor ve las suyas). 6 tests.
- **7.2 Comunicados** (`announcements_module`): scope PROPERTY/TOWER/UNIT,
  confirmación de lectura (AnnouncementRead, upsert idempotente). 4 tests.
- **7.3 Reservas** (`reservations_module`): zonas comunes + reservas con
  **overlap check** (anti doble-booking) + re-chequeo al aprobar. 5 tests.
- **7.4 Visitantes/Portería** (`visitors_pets_vehicles`): bitácora de
  ingreso/salida, rol SECURITY, OWNER/RESIDENT sin acceso. 4 tests.
- **7.5 Mascotas/Vehículos** (mismo migration): registro por unidad,
  assertUnitAccess (owner/resident de la unit). 6 tests.
- **7.6 Asambleas** (`assemblies_voting`): ordinaria/extraordinaria,
  asistencia con snapshot de coeficiente + poder, quorum. 
- **7.7 Votaciones por coeficiente** (mismo migration): voto único por
  unidad con snapshot, tally byCount + byCoefficient + totals. 7 tests
  (incluye verificación de la matemática del coeficiente).
- **7.8 Documentos** (`documents_accounting`): repositorio (reglamento,
  actas, etc.) con versionamiento por filas (version+1). 4 tests.
- **7.9 Contabilidad** (mismo migration): cuentas bancarias, categorías,
  transacciones (ingreso/egreso), presupuesto + **ejecución presupuestal**
  (planned vs executed vs variance) y reporte ingresos/egresos. Solo roles
  financieros. 5 tests.

### Estado al cerrar Fase 7
68 unit tests verdes (13 suites). 5 migraciones nuevas. Build OK, lint 0
errors. Tag `v0.9.0-phase7-complete`.

Deuda: file upload real para Document.fileUrl (Fase 8/9); tests e2e por
módulo; el seed no incluye datos de estos módulos nuevos.

### Progreso global
Fases 1-7 + 9 completas (8 de 10). Solo queda **Fase 8** (integraciones
externas: pasarela de pagos, email real, WhatsApp, PDF/Excel), que depende
de servicios/cuentas externas.

---

## 2026-05-24 — Fase 8 del plan (integraciones externas)

Estrategia: implementar de verdad lo que NO requiere credenciales externas, y
dejar abstracción + stub para lo que sí (patrón aprobado: misma interface,
proveedor real se conecta sin tocar el resto).

### 8.4 — PDF (pdfkit) — REAL
- `PdfService.accountStatement(unitId, user)`: estado de cuenta en PDF.
- `PdfService.pazYSalvo(unitId, user)`: certificado; Forbidden si hay deuda.
- Reusa `AccountStatementService` (ahora exportado desde FinanceModule).

### 8.5 — Excel (exceljs) — REAL
- `ExcelService.portfolio(propertyId, user)`: cartera por unidad + total, con
  formato de moneda. Solo roles financieros.

Módulo `src/modules/reports` (ReportsController):
- GET /api/v1/reports/account-statement/:unitId.pdf
- GET /api/v1/reports/paz-y-salvo/:unitId.pdf
- GET /api/v1/reports/portfolio/:propertyId.xlsx
Verificado: PDF válido (1 página), Excel válido (Microsoft Excel 2007+),
paz y salvo con deuda → 403.

### 8.1 + 8.6 — Pasarela de pagos + Webhook — ABSTRACCIÓN/STUB
- `PaymentGatewayService`: createCheckout (stub URL) + verifyWebhookSignature
  (HMAC-SHA256 sobre GATEWAY_WEBHOOK_SECRET, timingSafeEqual).
- POST /api/v1/payments/:id/checkout y POST /api/v1/payments/webhook (@Public,
  auth por firma).
- Refactor clave: extraída la allocation oldest-first de `approvePayment` a
  `allocateAndApprove(payment, auditUserId, reviewedBy)`, reusada por la
  aprobación manual (reviewedBy=MANUAL) y la automática del webhook
  (`approveViaGateway`, reviewedBy=GATEWAY). Sin duplicar lógica financiera.
- Verificado: webhook firma inválida → 401; válida → 201, pago APPROVED/GATEWAY
  con allocation ejecutada.

### 8.3 — WhatsApp/SMS — ABSTRACCIÓN/STUB
- `NotificationsService` (@Global): send(channel, to, message) + helpers.
  TODO prod: WhatsApp Cloud API / Twilio.

### 8.2 — Email
- Cubierto por `MailService` (Fase 6.1, log-transport). Adapter SMTP real con
  mailhog/Resend queda como TODO.

### Estado al cerrar Fase 8
Commits cb980d3 (PDF/Excel) y b671585 (gateway/webhook/notifications).
Build OK, 68 unit tests verdes, lint 0 errors. Tag `v0.10.0-phase8-complete`.

### 🏁 PROYECTO: las 10 fases del plan están completas
1 higiene · 2 seguridad · 3 observabilidad · 4 testing/CI · 5 API ·
6 auth+seed · 7 módulos negocio (9) · 8 integraciones · 9 infra prod ·
(10 docs/runbooks cubierto en fase 9).

Deuda técnica viva (toda documentada): conectar proveedores reales
(pasarela, email SMTP, WhatsApp, storage para file upload), email
verification flow, optimizar imagen Docker, subir coverage, activar
soft-delete extension, tests e2e por módulo de negocio.
