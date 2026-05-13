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
