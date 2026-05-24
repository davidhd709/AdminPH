# AdminPH — Frontend

Frontend del SaaS **AdminPH** (administración de propiedad horizontal en
Colombia). Consume la API del backend NestJS en `/api/v1`.

> **Fase 1 — Base.** Esta fase entrega la arquitectura, el layout, la
> autenticación base y las pantallas mínimas (login, dashboard, errores). Los
> módulos de negocio (CRUDs) se construyen en fases siguientes.

---

## Stack

- **Angular 21** — standalone components, **zoneless**, **signals**, control flow `@if/@for`.
- **TypeScript 5.9**
- **Angular Router** — lazy loading + functional guards.
- **HttpClient** — functional interceptors (auth + errores).
- **Reactive Forms**
- **PrimeNG 21** + **PrimeIcons** + **@primeuix/themes** (preset Aura, modo claro).
- **Tailwind CSS 4** (`@tailwindcss/postcss`).
- **RxJS**
- **ng-apexcharts / apexcharts** — gráficos del dashboard.
- Gestor de paquetes: **pnpm 10** (elegido por seguridad supply-chain).

---

## Requisitos

- Node.js ≥ 22
- pnpm ≥ 10 (`corepack enable` o `npm i -g pnpm`)
- Backend AdminPH corriendo en `http://localhost:3000` (para login real).

---

## Cómo ejecutar

```bash
cd frontend
pnpm install            # instala dependencias (scripts de build restringidos por seguridad)
pnpm start              # dev server en http://localhost:4200
```

Otros comandos:

```bash
pnpm run build          # build de producción -> dist/frontend
pnpm run watch          # build incremental en modo desarrollo
pnpm audit              # auditoría de seguridad de dependencias
```

---

## Variables de entorno

No hay secretos en el frontend. La única configuración es la URL de la API:

| Archivo | Uso | apiUrl |
|---|---|---|
| `src/environments/environment.ts` | producción (default) | `/api/v1` (mismo origen, detrás de Nginx) |
| `src/environments/environment.development.ts` | desarrollo | `http://localhost:3000/api/v1` |
| `src/environments/environment.example.ts` | plantilla | — |

El reemplazo dev→prod lo hace `angular.json` (`fileReplacements`).

---

## Seguridad de dependencias (supply-chain)

- Gestor **pnpm**: no ejecuta lifecycle scripts de dependencias por defecto;
  solo los listados en `package.json > pnpm.onlyBuiltDependencies` (hoy: `esbuild`).
- `.npmrc` con lockfile estricto, registry oficial y node_modules sin hoisting
  (evita phantom dependencies). Cooldown de versiones documentado (opcional).
- `pnpm audit`: **0 vulnerabilidades** al cierre de la Fase 1.
- Solo dependencias oficiales y necesarias (Angular, PrimeNG, Tailwind, ApexCharts).

---

## Arquitectura

```
src/app/
├── core/                    # singletons, sin UI
│   ├── auth/                # auth.service, token.service, auth.store (signals),
│   │                        # auth.models, permissions (RBAC por permiso)
│   ├── guards/              # authGuard, publicGuard, roleGuard(...)
│   ├── interceptors/        # authInterceptor (Bearer), errorInterceptor (401/403/5xx)
│   └── config/              # api.config (endpoints centralizados)
├── shared/                  # componentes/pipes/utils reutilizables
│   └── components/          # page-header, empty-state, loading-state,
│                            # error-state, status-badge
├── layout/                  # shell (sidebar + topbar + outlet), navigation (menú)
├── features/                # módulos de negocio (lazy)
│   ├── auth/pages/          # login, forgot-password, reset-password
│   ├── dashboard/
│   ├── errors/              # forbidden (403), not-found (404)
│   └── (companies, properties, ... )  # fases siguientes
├── app.routes.ts            # rutas + guards + lazy loading
├── app.config.ts            # providers (router, http, primeng, animations)
└── app.ts                   # root (toast global + outlet)
```

### Decisiones clave

- **RBAC por permiso, no por rol en templates.** `core/auth/permissions.ts`
  mapea cada rol a una lista de `Permission`. El sidebar y los guards consultan
  permisos; los templates nunca hardcodean roles. Cambiar la política es un
  solo archivo.
- **Estado de auth con Signals** (`AuthStore`): `user`, `role`, `isAuthenticated`,
  `hasRole(...)` — todo reactivo, compatible con zoneless.
- **Multi-tenancy listo:** `AuthUser.companyId` y `AuthStore.companyId()` están
  disponibles desde el inicio para scoping futuro.
- **Interceptors funcionales:** el `authInterceptor` agrega el Bearer solo a la
  API y omite endpoints de login/refresh; el `errorInterceptor` centraliza
  401 (limpia sesión → /login), 403/5xx (toast).
- **Lazy loading** en todas las rutas (`loadComponent`).

---

## Roles soportados

`SUPERADMIN`, `COMPANY_ADMIN`, `PROPERTY_ADMIN`, `ACCOUNTANT`, `SECURITY`,
`OWNER`, `RESIDENT`. Cada uno ve un menú distinto (filtrado por permiso en
`layout/sidebar`).

---

## Rutas

| Ruta | Acceso | Descripción |
|---|---|---|
| `/login` | pública (publicGuard) | Inicio de sesión |
| `/forgot-password` | pública | Solicitar reset |
| `/reset-password?token=` | pública | Definir nueva contraseña |
| `/app` | privada (authGuard) | Shell con layout |
| `/app/dashboard` | privada | Dashboard con stats + gráfico |
| `/403` | — | Acceso denegado |
| `/404` | — | No encontrado |

---

## Pendientes / próxima fase

- **Fase 2:** conectar login real end-to-end, rehidratación de sesión
  (`loadCurrentUser` al boot), refresh token automático en el interceptor.
- CRUDs de los módulos de negocio (companies, properties, units, finance, etc.).
- `roleGuard` aplicado a rutas de cada módulo.
- Tests (vitest) de guards/store/servicios.
- Revisar que `apexcharts` quede en chunk lazy (hoy infla el bundle inicial).
