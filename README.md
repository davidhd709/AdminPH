# AdminPH

> SaaS multi-tenant para administración de propiedad horizontal en Colombia
> (conjuntos residenciales, edificios, copropiedades).

Estado: **MVP base** — backend NestJS + PostgreSQL operativo, auth verificado,
multi-tenancy en código. Roadmap a producción en [PLAN.md](./PLAN.md).

---

## Tabla de contenido

- [Requisitos](#requisitos)
- [Setup local](#setup-local)
- [Comandos disponibles](#comandos-disponibles)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Decisiones técnicas clave](#decisiones-técnicas-clave)
- [Documentación adicional](#documentación-adicional)
- [Contribuir](#contribuir)

---

## Requisitos

- **Node.js ≥ 22** (verificar con `node -v`).
- **Docker** + **Docker Compose** (para PostgreSQL).
- **Git** ≥ 2.30.
- **npm** ≥ 10 (viene con Node 22).

Sistemas testeados: Linux (Fedora 43). macOS y Windows con WSL2 deberían
funcionar igual.

---

## Setup local

### 1. Clonar y entrar al repo

```bash
git clone https://github.com/davidhd709/AdminPH.git
cd AdminPH
```

### 2. Levantar PostgreSQL

```bash
docker compose up -d
```

Se crea el contenedor `adminph_postgres` en el puerto **5434** (externo) →
`5432` (interno). Credenciales por defecto:

- usuario: `adminph`
- password: `adminph_password`
- database: `adminph_db`

> El puerto 5434 evita choque con un PostgreSQL local en 5432 y con otro
> Postgres en 5433 (otro proyecto del autor en su máquina).

### 3. Configurar variables de entorno

```bash
cd backend
cp .env.example .env
```

`.env.example` ya viene con valores válidos para desarrollo local.
**Antes de producción** se deben rotar `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
y la URL de BD.

### 4. Instalar dependencias

```bash
# desde la raíz del repo (Husky se instala por el postinstall)
cd ..
npm install        # raíz: husky, commitlint, lint-staged

cd backend
npm install        # backend: NestJS, Prisma, etc.
```

### 5. Generar cliente Prisma y aplicar migraciones

```bash
cd backend
npx prisma generate
npx prisma migrate deploy   # aplica las migraciones existentes a la BD
```

> Para `prisma migrate dev` se necesita terminal interactivo. En CI/headless
> usar `migrate deploy`.

### 6. (Opcional) Seed

```bash
npx prisma db seed
```

Crea un superadmin + empresa + copropiedad demo. Idempotente.

### 7. Levantar el backend

```bash
npm run start:dev
```

Accesos:
- API: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api/docs`

---

## Comandos disponibles

### Raíz del repo (`Ph/`)

| Comando              | Qué hace                                        |
|----------------------|-------------------------------------------------|
| `npm run lint`       | Pasa lint en backend                            |
| `npm run lint:fix`   | Lint + auto-fix                                 |
| `npm run format`     | Prettier write en backend                       |
| `npm run format:check` | Prettier check (CI)                           |
| `npm run build`      | Compila backend (`nest build`)                  |
| `npm run test`       | (Placeholder — Fase 4 del plan)                 |

### Backend (`backend/`)

| Comando                  | Qué hace                                    |
|--------------------------|---------------------------------------------|
| `npm run build`          | `nest build` (compila a `dist/`)            |
| `npm run start`          | Arranca desde `dist/` (producción)          |
| `npm run start:dev`      | Watch mode con recompilación                |
| `npm run start:debug`    | Watch mode + debugger en `localhost:9229`   |
| `npm run prisma:validate`| Valida `schema.prisma`                      |
| `npm run prisma:generate`| Regenera el Prisma Client                   |
| `npm run prisma:migrate` | `prisma migrate dev` (interactivo)          |
| `npm run prisma:seed`    | Ejecuta `prisma/seed.ts`                    |
| `npm run lint`           | ESLint                                      |
| `npm run lint:fix`       | ESLint con auto-fix                         |
| `npm run format`         | Prettier write                              |
| `npm run format:check`   | Prettier check                              |

---

## Estructura del repositorio

```txt
Ph/
├── .editorconfig                # convenciones de editor
├── .gitignore
├── .husky/                      # hooks de git (pre-commit, commit-msg)
├── commitlint.config.mjs        # validación de mensajes Conventional Commits
├── docker-compose.yml           # PostgreSQL para dev
├── package.json                 # tooling raíz: husky, lint-staged, commitlint
├── README.md
├── CONTRIBUTING.md              # cómo colaborar (convenciones, PR flow)
├── PLAN.md                      # plan completo a producción (10 fases)
├── HISTORIAL.md                 # bitácora cronológica de cambios
├── AdminPH_contexto_completo.md # contexto de negocio del producto
└── backend/                     # aplicación NestJS
    ├── eslint.config.mjs        # ESLint flat config
    ├── .prettierrc              # Prettier config
    ├── .lintstagedrc.json       # lint-staged config (corre en pre-commit)
    ├── tsconfig.json            # strict: true
    ├── prisma/
    │   ├── schema.prisma        # modelo de datos (single source of truth)
    │   ├── seed.ts              # seed inicial
    │   └── migrations/          # migraciones SQL versionadas
    ├── src/
    │   ├── main.ts              # bootstrap NestJS
    │   ├── app.module.ts        # módulo raíz
    │   ├── core/                # decoradores, guards, types compartidos
    │   │   ├── decorators/
    │   │   ├── guards/
    │   │   ├── middleware/
    │   │   ├── prisma/
    │   │   └── types/           # AuthUser, augment Express.Request
    │   └── modules/             # módulos de dominio
    │       ├── auth/
    │       ├── users/
    │       ├── companies/
    │       ├── properties/
    │       ├── towers/
    │       ├── units/
    │       ├── people/
    │       ├── finance/
    │       ├── payments/
    │       ├── audit/
    │       └── prisma/
    └── package.json
```

---

## Decisiones técnicas clave

| Tema                      | Decisión                                                        |
|---------------------------|-----------------------------------------------------------------|
| Framework backend         | NestJS (monolito modular)                                       |
| Lenguaje                  | TypeScript, `strict: true`, `noUnusedLocals: true`              |
| ORM                       | Prisma 7 con **Driver Adapter** `@prisma/adapter-pg`            |
| Base de datos             | PostgreSQL 16                                                   |
| Multi-tenancy             | Single-DB, validación en código por `companyId`/`propertyId`    |
| Auth                      | JWT access + refresh, hash bcrypt                               |
| Auditoría                 | Modelo `AuditLog` con persistencia desde services críticos      |
| Soft delete               | Campo `deletedAt` (consistencia pendiente — Fase 2 del plan)    |
| Validación                | class-validator + ValidationPipe global con `whitelist: true`   |
| Linter / formato          | ESLint flat config + Prettier + EditorConfig                    |
| Convención de commits     | [Conventional Commits](https://www.conventionalcommits.org/) (enforced por commitlint) |
| Pre-commit                | Husky 9 + lint-staged                                           |
| Documentación API         | Swagger en `/api/docs` (Fase 5: completar con `@ApiProperty`)    |

---

## Documentación adicional

- **[PLAN.md](./PLAN.md)** — Roadmap a producción dividido en 10 fases con
  criterios de éxito explícitos.
- **[HISTORIAL.md](./HISTORIAL.md)** — Bitácora cronológica de todo lo
  ejecutado en el proyecto.
- **[AdminPH_contexto_completo.md](./AdminPH_contexto_completo.md)** —
  Contexto de negocio: alcance del producto, roles, módulos, reglas
  financieras críticas.
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — Cómo colaborar: convenciones,
  flujo de PR, branches, commits, code review.

---

## Contribuir

Lee [CONTRIBUTING.md](./CONTRIBUTING.md) antes de abrir un PR.

Resumen ultra-corto:

1. Branch desde `main`: `feat/...`, `fix/...`, `chore/...`, `docs/...`.
2. Commits siguiendo Conventional Commits (validado por Husky `commit-msg`).
3. `npm run lint && npm run build` deben pasar localmente.
4. PR a `main` con descripción clara y referencia al issue (si aplica).
5. Requiere ≥1 reviewer; squash merge por defecto.

---

## Licencia

Por definir.
