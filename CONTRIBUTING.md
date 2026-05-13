# Contribuir a AdminPH

Gracias por sumar al proyecto. Este documento define las **reglas no
negociables** que todos los colaboradores deben seguir.

---

## Antes de empezar

1. Lee [README.md](./README.md) y completa el setup local.
2. Lee [PLAN.md](./PLAN.md): cada cambio debe encajar en una fase del plan.
   Si tu cambio no entra en ninguna fase, propónla primero como issue.
3. Lee [AdminPH_contexto_completo.md](./AdminPH_contexto_completo.md) para
   entender el dominio (propiedad horizontal en Colombia).

---

## Flujo de trabajo

### Branches

- `main` → siempre desplegable. Protegida (cuando hagamos branch protection en
  GitHub).
- Para cualquier cambio: branch a partir de `main` con uno de estos prefijos:

  | Prefijo     | Para qué                                            |
  |-------------|-----------------------------------------------------|
  | `feat/`     | Nueva funcionalidad                                 |
  | `fix/`      | Bug fix                                             |
  | `refactor/` | Refactor sin cambio de comportamiento               |
  | `chore/`    | Tooling, configs, deps                              |
  | `docs/`     | Documentación                                       |
  | `test/`     | Tests                                               |
  | `ci/`       | CI/CD                                               |

  Ejemplo: `feat/payment-file-upload`, `fix/auth-refresh-token-leak`.

### Commits

**Conventional Commits obligatorio.** Validado automáticamente por
`commitlint` en el hook `commit-msg`.

Formato:

```txt
<tipo>(<scope opcional>): <descripción corta en imperativo>

<cuerpo opcional explicando QUÉ y POR QUÉ, no CÓMO>

<footer opcional: refs a issues, breaking changes>
```

Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert`.

Ejemplos:

```txt
feat(payments): add file upload for receiptUrl
fix(auth): rotate refresh token on use
chore(tooling): bump prisma to 7.9
docs(plan): mark fase 2 as completed
```

**Header max 100 chars.** El cuerpo puede ser tan largo como necesites.

### Pre-commit

Husky corre automáticamente:

1. `lint-staged` sobre archivos staged (`eslint --fix` + `prettier --write`).
2. `commitlint` sobre el mensaje del commit.

Si algo falla, el commit se aborta. **No usar `--no-verify` salvo emergencia
documentada.**

### Pull Requests

1. Push tu branch a `origin`.
2. Abre PR contra `main` con:
   - **Título**: Conventional Commit (igual que los commits).
   - **Descripción** con:
     - Qué cambia y por qué.
     - Referencia a la fase del PLAN.md si aplica.
     - Lista de archivos críticos tocados.
     - Cómo probarlo (pasos manuales o tests).
     - Screenshots si es UI (no aplica en este repo backend).
3. CI debe estar verde (cuando exista — Fase 4 del plan).
4. **Al menos 1 reviewer** debe aprobar.
5. Squash merge por defecto. Conserva un commit por feature en `main`.

---

## Estándares de código

### TypeScript

- `strict: true` activo. No usar `@ts-ignore` salvo causa documentada.
- **Cero `any` en código nuevo.** Los `any` actuales son deuda explícita
  (143 lugares). Usar:
  - `AuthUser` para el `request.user`.
  - `unknown` cuando realmente no sabes el tipo, con narrowing en runtime.
  - Tipos de Prisma (`User`, `Fee`, `Prisma.<X>GetPayload<{ include: {...} }>`).
- DTOs con `class-validator` + `!` para definite assignment.

### NestJS

- **Multi-tenancy** se valida SIEMPRE en backend contra `request.user`. Nunca
  confiar en `companyId`/`propertyId` enviado por el cliente.
- Inyección de dependencias: usar `import` regular (no `import type`) para
  servicios inyectados. `import type` rompe `reflect-metadata`.
- **Pagos siempre dentro de `prisma.$transaction`.**
- **Paz y salvo nunca con deuda pendiente** (ver reglas 5-10 en PLAN.md).
- Audit log obligatorio en CREATE/UPDATE/DELETE/APPROVE/REJECT y en
  LOGIN/LOGOUT/CHANGE_PASSWORD.

### Soft delete

- Borrado = `update { deletedAt: new Date() }`, no `delete()`.
- Todas las queries de lectura filtran `deletedAt: null`.
- Cuando Fase 2 active la Prisma Extension de soft-delete, esto se vuelve
  automático. Mientras tanto, filtrado manual.

### Prisma

- Migraciones siempre con `prisma migrate dev` (local) o `migrate deploy`
  (CI/prod).
- Nunca editar una migración ya aplicada en `main`.
- Nunca `prisma db push` contra producción.
- Schema = single source of truth. Tipos derivados de Prisma cuando se pueda.

### Logs

- No `console.log` en código de producción. Usar el Logger de Nest (y, cuando
  llegue Fase 3, Pino).
- Permitidos: `console.warn`, `console.error`, `console.info` (regla ESLint).
- Nunca loguear: passwords, JWTs, refresh tokens, payloads sensibles.

---

## Estándares de tests (cuando lleguemos a Fase 4)

- `*.spec.ts` junto al archivo testeado.
- E2E en `backend/test/`.
- Mockear `PrismaService` y `AuditService` en unit tests.
- Tests de integración con PostgreSQL real (`docker-compose.test.yml`,
  puerto 5435).
- Coverage objetivo inicial: 50% en services críticos. Subir a 70% en 6 meses.

---

## Seguridad

- Nunca commitear secrets. Si se filtra:
  1. Rotar inmediatamente el secret afectado.
  2. Limpiar historial con `git filter-repo` o BFG.
  3. Forzar push (con permiso explícito del owner).
- Reportar vulnerabilidades vía issue privado a `@davidhd709`.

---

## Reglas no negociables (resumen)

| #  | Regla                                                                  |
|----|------------------------------------------------------------------------|
| 1  | Conventional Commits obligatorio.                                       |
| 2  | Build + lint deben pasar antes de PR.                                  |
| 3  | Nunca confiar en `companyId`/`propertyId` del body.                    |
| 4  | Pagos en `prisma.$transaction`.                                        |
| 5  | Paz y salvo nunca con deuda pendiente.                                 |
| 6  | Soft delete por defecto; hard delete solo con job dedicado + audit.    |
| 7  | Cero `any` en código nuevo.                                            |
| 8  | Sin `--no-verify` en commits o `--force` en push a `main`.             |
| 9  | Sin `prisma db push` en `main`.                                        |
| 10 | Audit log obligatorio en acciones de seguridad/financieras.            |

---

## Dudas

Abre un issue con la etiqueta `question` o pregunta en el canal del equipo.
