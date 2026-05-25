# AdminPH — Frontend

Frontend del SaaS **AdminPH** (administración de propiedad horizontal en
Colombia). Consume la API del backend NestJS en `/api/v1`.

> **Fase 1 — Base.** Arquitectura, layout, autenticación base y pantallas
> mínimas (login, dashboard, errores).
>
> **Fase 2 — Auth end-to-end ✅.** Login real contra el backend, rehidratación
> de sesión al boot, refresh token transparente ante 401 y `roleGuard` aplicado
> a una ruta de módulo de referencia.
>
> **Fase 3 — Primer CRUD ✅.** Módulo **Empresas** conectado a la API: tabla con
> paginación/ordenamiento server-side, alta/edición en diálogo (Reactive Forms)
> y borrado con confirmación. Es el patrón de referencia para los demás módulos.
>
> **Fase 3.2 — CRUD multi-tenant ✅.** Módulo **Copropiedades**: replica el
> patrón con scoping por empresa (SUPERADMIN elige empresa al crear y ve todas;
> COMPANY_ADMIN queda acotado a la suya).
>
> **Fase 3.3 — CRUD anidado ✅.** Módulo **Torres**: selector de copropiedad +
> listado scoped (`GET /towers?propertyId=`). El borrado se oculta a roles sin
> permiso real en el backend (solo SUPERADMIN/COMPANY_ADMIN).
>
> **Fase 3.4 — CRUD anidado con cascada ✅.** Módulo **Unidades**: selector de
> copropiedad + dropdown de torre (cascada) + listado scoped. `status` es solo
> lectura (lo define el backend).
>
> **Fase 3.5 — Relaciones por unidad ✅.** Módulo **Propietarios y residentes**:
> cascada copropiedad → unidad → personas, con selector de usuario (requirió
> enriquecer el backend: `GET /users` paginado e `include` del usuario en
> owners/residents). Cierra la sección Administración.
>
> **Fase 4.1 — Finanzas: conceptos ✅.** Módulo **Cuotas y conceptos** (conceptos
> de cobro por copropiedad). Requirió exponer `FeeConceptsService` con un
> controller nuevo en el backend. Inicia la sección Finanzas.
>
> **Fase 4.2 — Finanzas: pagos ✅.** Módulo **Pagos** (cuotas + pagos por unidad,
> con aprobar/rechazar). Requirió agregar `GET /payments` y corregir 3 bugs del
> backend de finanzas (scoping de cuotas, doble `@Query`, fechas y campos no
> persistibles).
>
> **Fase 4.3 — Finanzas: contabilidad ✅.** Módulo **Contabilidad** (movimientos,
> categorías y cuentas bancarias por copropiedad). Requirió corregir los 3
> listados de accounting (mismo patrón de doble `@Query`).
>
> **Fase 4.4 — Finanzas: reportes ✅.** Módulo **Reportes**: descarga de estado de
> cuenta y paz y salvo (PDF) y cartera (Excel), autenticados como Blob. Cierra
> la sección **Finanzas** (solo frontend, sin cambios de backend).
>
> **Fase 5.1 — Operación: PQR ✅.** Módulo **PQR**: lista con filtros, creación y
> detalle con hilo de respuestas + cambio de estado (staff). Inicia la sección
> Operación.
>
> **Fase 5.2 — Operación: comunicados ✅.** Módulo **Comunicados**: lista filtrable,
> creación con alcance (copropiedad/torre/unidad) y detalle del cuerpo.
>
> **Fase 5.3 — Operación: reservas ✅.** Módulo **Reservas**: zonas comunes
> (crear/listar) y reservas (crear con horario, aprobar/rechazar/cancelar);
> el backend valida solapamientos.
>
> **Fase 5.4 — Operación: portería ✅.** Módulo **Portería**: visitantes
> (ingreso/salida), vehículos y mascotas por copropiedad.
>
> **Fase 5.5 — Operación: asambleas ✅.** Módulo **Asambleas** (lista + detalle
> dedicado): estado, asistencia con quórum, votaciones, votos y escrutinio.
>
> **Fase 5.6 — Operación: documentos ✅.** Módulo **Documentos**: repositorio de
> metadatos + URL (crear, nueva versión, abrir, eliminar). Cierra la sección
> **Operación**. El upload binario real es deuda del backend.

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
- **Interceptors funcionales (orden: auth → refresh → error):** `authInterceptor`
  agrega el Bearer solo a la API y omite endpoints de login/refresh;
  `refreshInterceptor` rota el refresh token ante un 401 con **single-flight**
  (las requests concurrentes esperan en cola y se reanudan con el token nuevo);
  `errorInterceptor` centraliza 401 (limpia sesión → /login), 403/5xx (toast).
- **Rehidratación al boot:** `provideAppInitializer(initSession)` carga
  `/users/me` cuando hay un token guardado, repoblando el `AuthStore` antes de
  renderizar la app.
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
| `/app/companies` | privada + `roleGuard("SUPERADMIN")` | CRUD de empresas (tabla + diálogo) |
| `/app/properties` | privada + `roleGuard("SUPERADMIN", "COMPANY_ADMIN")` | CRUD de copropiedades (multi-tenant) |
| `/app/towers` | privada + `roleGuard("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")` | CRUD de torres (anidado en copropiedad) |
| `/app/units` | privada + `roleGuard("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")` | CRUD de unidades (anidado, con torre opcional) |
| `/app/people` | privada + `roleGuard("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")` | Propietarios y residentes por unidad |
| `/app/finance/concepts` | privada + `roleGuard("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")` | Conceptos de cobro por copropiedad |
| `/app/finance/payments` | privada + `roleGuard("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")` | Pagos y cuotas por unidad |
| `/app/finance/accounting` | privada + `roleGuard("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")` | Movimientos, categorías y cuentas |
| `/app/finance/reports` | privada + `roleGuard("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")` | Descarga de reportes (PDF/Excel) |
| `/app/pqr` | privada + `roleGuard("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")` | Gestión de PQR (lista, detalle, respuestas) |
| `/app/announcements` | privada + `roleGuard("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")` | Comunicados (lista, crear, detalle) |
| `/app/reservations` | privada + `roleGuard("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")` | Reservas y zonas comunes |
| `/app/security` | privada + `roleGuard("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")` | Portería (visitantes, vehículos, mascotas) |
| `/app/assemblies` | privada + `roleGuard("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")` | Asambleas (lista + crear) |
| `/app/assemblies/:id` | privada + mismo guard | Detalle: asistencia, votaciones, votos |
| `/app/documents` | privada + `roleGuard("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")` | Documentos (metadatos + URL) |
| `/403` | — | Acceso denegado |
| `/404` | — | No encontrado |

---

## Pendientes / próxima fase

- ~~**Fase 2:** login real end-to-end, rehidratación de sesión, refresh token
  automático, `roleGuard` en ruta de referencia.~~ ✅ Completada.
- ~~**Fase 3:** primer CRUD real (Empresas) con paginación server-side, diálogo
  de alta/edición y borrado con confirmación.~~ ✅ Completada.
- ~~**Fase 3.2:** CRUD multi-tenant (Copropiedades) con scoping por empresa.~~ ✅ Completada.
- ~~**Fase 3.3:** CRUD anidado (Torres) con selector de copropiedad.~~ ✅ Completada.
- ~~**Fase 3.4:** CRUD anidado con cascada (Unidades) con dropdown de torre.~~ ✅ Completada.
- ~~**Fase 3.5:** Propietarios y residentes por unidad (con selector de usuario).~~ ✅ Completada.
  Cierra la sección **Administración** (empresas → copropiedades → torres →
  unidades → personas).
- **Finanzas** ✅: ~~conceptos~~ · ~~pagos~~ · ~~contabilidad~~ · ~~reportes~~.
- **Operación** ✅: ~~PQR~~ · ~~comunicados~~ · ~~reservas~~ · ~~portería~~ ·
  ~~asambleas~~ · ~~documentos~~.
- Pendiente: vistas de **Mi cuenta** (OWNER/RESIDENT), pulido transversal
  (sidebar activo, breadcrumbs, dashboard real) y tests (vitest).
- Tests (vitest) de guards/store/servicios/interceptors.
- Revisar que `apexcharts` quede en chunk lazy (hoy infla el bundle inicial).
