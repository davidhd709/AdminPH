# AdminPH — Contexto completo del software

## 1. Resumen general

**AdminPH** es un software SaaS web multiempresa para la administración de propiedad horizontal en Colombia.

El objetivo del sistema es permitir que empresas administradoras de propiedad horizontal gestionen de forma centralizada:

- Conjuntos residenciales.
- Edificios de apartamentos.
- Copropiedades.
- Torres o bloques.
- Unidades privadas.
- Propietarios.
- Residentes.
- Cuotas de administración.
- Cartera.
- Mora.
- Pagos con comprobantes de transferencia.
- Estados de cuenta.
- Paz y salvo.
- Reportes financieros.
- PQR.
- Comunicados.
- Reservas de zonas comunes.
- Visitantes y portería.
- Mascotas y vehículos.
- Asambleas.
- Votaciones por coeficiente.
- Actas.
- Documentos.
- Contabilidad administrativa.

El sistema está pensado para Colombia, por lo tanto debe considerar la lógica de la **propiedad horizontal colombiana**, especialmente:

- Copropiedades.
- Coeficientes de copropiedad.
- Consejo de administración.
- Administrador.
- Asamblea general.
- Cuotas de administración.
- Cartera.
- Intereses de mora.
- Paz y salvo.
- Actas.
- Documentos.
- Votaciones por coeficiente.
- Estados financieros.
- Presupuestos.
- Reglamento de propiedad horizontal.

---

## 2. Tipo de producto

El producto será un **SaaS B2B multiempresa**.

Esto significa que una misma plataforma podrá venderse a varias empresas administradoras.

Cada empresa administradora podrá gestionar varias copropiedades.

Ejemplo de jerarquía:

```txt
Plataforma AdminPH
└── Empresa administradora A
    ├── Copropiedad 1
    │   ├── Torre A
    │   ├── Torre B
    │   ├── Unidades privadas
    │   ├── Propietarios
    │   ├── Residentes
    │   ├── Cuotas
    │   ├── Pagos
    │   └── Cartera
    │
    └── Copropiedad 2

└── Empresa administradora B
    ├── Copropiedad 3
    └── Copropiedad 4
```

La regla crítica del SaaS es:

```txt
Una empresa administradora nunca debe poder ver datos de otra empresa.
Una copropiedad nunca debe exponer información financiera a usuarios no autorizados.
Un propietario solo debe poder ver sus propias unidades.
Un residente solo debe poder ver las unidades donde reside.
```

---

## 3. Stack tecnológico recomendado

### Backend

- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- Prisma 7
- JWT Authentication
- Refresh Tokens
- RBAC
- Multi-tenancy por `companyId` y `propertyId`
- Soft delete
- AuditLog
- Swagger/OpenAPI
- class-validator
- Docker
- Docker Compose

### Frontend futuro

- Next.js 15
- React
- TypeScript
- Tailwind CSS
- Shadcn/UI
- React Hook Form
- Zod
- TanStack Query
- Axios
- Zustand
- Lucide React
- Recharts
- App Router

### Infraestructura

- Ubuntu 24.04 en VPS Contabo
- Docker
- Docker Compose
- Nginx
- Cloudflare DNS
- Posible almacenamiento de archivos en Cloudflare R2, AWS S3 o MinIO

---

## 4. Roles del sistema

El sistema debe manejar los siguientes roles:

### 4.1 SUPERADMIN

Administrador global de la plataforma SaaS.

Puede:

- Crear empresas administradoras.
- Suspender empresas.
- Ver métricas globales.
- Gestionar planes futuros.
- Acceder a soporte global.
- Tener acceso general para administración del SaaS.

### 4.2 COMPANY_ADMIN

Usuario administrador de una empresa administradora.

Puede:

- Gestionar copropiedades de su empresa.
- Gestionar usuarios internos.
- Ver reportes de las copropiedades de su empresa.
- Gestionar administradores, contadores y personal autorizado.
- Acceder solo a su empresa.

### 4.3 PROPERTY_ADMIN

Administrador de una copropiedad específica.

Puede:

- Gestionar la copropiedad asignada.
- Gestionar torres.
- Gestionar unidades.
- Gestionar propietarios.
- Gestionar residentes.
- Gestionar cuotas.
- Ver cartera.
- Aprobar pagos si tiene permiso.
- Gestionar PQR, comunicados, reservas y documentos.

### 4.4 ACCOUNTANT

Contador.

Puede:

- Crear conceptos de cobro.
- Generar cuotas.
- Revisar pagos.
- Aprobar pagos.
- Rechazar pagos.
- Ver cartera.
- Ver reportes financieros.
- Generar estados de cuenta.
- Validar paz y salvo.
- Acceder solo a las copropiedades asignadas.

### 4.5 SECURITY

Vigilancia o portería.

Puede:

- Registrar visitantes.
- Registrar paquetes.
- Registrar novedades.
- Controlar ingresos y salidas.
- Ver datos operativos necesarios.
- No debe acceder a información financiera.

### 4.6 OWNER

Propietario.

Puede:

- Ver sus unidades.
- Ver su estado de cuenta.
- Ver cuotas pendientes.
- Subir comprobantes de pago.
- Consultar pagos realizados.
- Consultar paz y salvo.
- Crear PQR.
- Consultar comunicados.
- Reservar zonas comunes.
- Participar en asambleas y votaciones si aplica.

### 4.7 RESIDENT

Residente o arrendatario.

Puede:

- Ver información limitada de la unidad donde reside.
- Crear solicitudes si se permite.
- Consultar comunicados.
- Hacer reservas si la copropiedad lo permite.
- No necesariamente puede ver toda la información financiera, dependiendo de la configuración.

---

## 5. Módulos planeados

### 5.1 Core SaaS

Incluye:

- Empresas administradoras.
- Copropiedades.
- Usuarios.
- Roles.
- Permisos.
- Multi-tenancy.
- Auditoría.
- Soft delete.

### 5.2 Gestión de copropiedades

Incluye:

- Crear copropiedad.
- Editar copropiedad.
- Configurar datos básicos.
- Dirección.
- Ciudad.
- Departamento.
- NIT si aplica.
- Datos bancarios.
- Logo.
- Estado.
- Reglamento de propiedad horizontal.

### 5.3 Torres, bloques y unidades privadas

Incluye:

- Crear torres o bloques.
- Crear apartamentos o unidades privadas.
- Asociar unidad a torre.
- Asociar unidad a copropiedad.
- Registrar área privada.
- Registrar coeficiente.
- Estado de unidad:
  - Ocupada.
  - Vacía.
  - Arrendada.
  - En mantenimiento.
- Asociar propietarios.
- Asociar residentes.

### 5.4 Propietarios y residentes

Incluye:

- Registro de propietarios.
- Registro de residentes.
- Asociación a unidades.
- Identificación.
- Teléfono.
- WhatsApp.
- Email.
- Relación con usuario del sistema.
- Historial.

### 5.5 Módulo financiero

Este es el núcleo del MVP.

Incluye:

- Conceptos de cobro.
- Cuotas.
- Generación masiva de cuotas.
- Cálculo por valor fijo.
- Cálculo por coeficiente.
- Cartera.
- Mora.
- Pagos con comprobante.
- Aprobación de pagos.
- Rechazo de pagos.
- PaymentAllocation.
- Estados de cuenta.
- Paz y salvo.
- Reportes financieros base.

### 5.6 PQR

Incluye:

- Solicitudes.
- Categorías.
- Estados.
- Adjuntos.
- Respuestas.
- Historial.
- Número de radicado.

### 5.7 Comunicados

Incluye:

- Comunicados generales.
- Comunicados por torre.
- Comunicados por unidad.
- Adjuntos.
- Confirmación de lectura.

### 5.8 Reservas de zonas comunes

Incluye:

- Salón social.
- Piscina.
- BBQ.
- Gimnasio.
- Cancha.
- Parqueadero de visitantes.
- Configuración de horarios.
- Aprobación o rechazo.
- Calendario.

### 5.9 Visitantes y portería

Incluye:

- Registro de visitantes.
- Domicilios.
- Proveedores.
- Técnicos.
- Paquetes.
- Bitácora.
- Autorizaciones.
- Futuro QR de ingreso.

### 5.10 Mascotas y vehículos

Incluye:

- Registro de mascotas por unidad.
- Registro de vehículos por unidad.
- Parqueaderos.
- Autorizaciones.

### 5.11 Asambleas

Incluye:

- Asamblea ordinaria.
- Asamblea extraordinaria.
- Convocatoria.
- Orden del día.
- Registro de asistencia.
- Quorum.
- Poderes.
- Actas.

### 5.12 Votaciones por coeficiente

Incluye:

- Votación simple.
- Votación nominal.
- Votación por coeficiente.
- Votos:
  - Sí.
  - No.
  - En blanco.
  - Abstención.
- Cálculo por número de votos.
- Cálculo por coeficiente.

### 5.13 Actas y documentos

Incluye:

- Reglamento de propiedad horizontal.
- Actas.
- Contratos.
- Estados financieros.
- Presupuestos.
- Pólizas.
- Certificados.
- Comunicados.
- Versionamiento futuro.

### 5.14 Contabilidad administrativa

Primera versión no será contabilidad certificada, sino administrativa.

Incluye:

- Ingresos.
- Egresos.
- Cuentas bancarias.
- Categorías.
- Presupuesto anual.
- Ejecución presupuestal.
- Reporte de ingresos y gastos.

---

## 6. MVP recomendado

El MVP no debe intentar construir todos los módulos desde el inicio.

El MVP comercial inicial debe enfocarse en:

1. Login y autenticación.
2. Roles y permisos.
3. Empresas administradoras.
4. Copropiedades.
5. Torres.
6. Unidades privadas.
7. Propietarios.
8. Residentes.
9. Conceptos de cobro.
10. Generación de cuotas.
11. Cartera.
12. Intereses de mora.
13. Pagos con comprobantes.
14. Aprobación y rechazo de pagos.
15. PaymentAllocation.
16. Estado de cuenta.
17. Paz y salvo.
18. Reportes financieros base.
19. Dashboard para administrador.
20. Dashboard para contador.
21. Dashboard para propietario.

---

## 7. Arquitectura backend esperada

El backend debe seguir una arquitectura de monolito modular.

Estructura esperada:

```txt
backend/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── core/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   │
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── tenancy.guard.ts
│   │   │
│   │   ├── middleware/
│   │   │   └── tenancy.interceptor.ts
│   │   │
│   │   └── prisma/
│   │       └── prisma-extension.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── companies/
│   │   ├── properties/
│   │   ├── towers/
│   │   ├── units/
│   │   ├── people/
│   │   ├── finance/
│   │   ├── payments/
│   │   ├── audit/
│   │   └── prisma/
│   │
│   └── common/
│
├── package.json
├── tsconfig.json
├── nest-cli.json
├── prisma.config.ts
├── docker-compose.yml
├── .env
└── .env.example
```

---

## 8. Modelos principales de base de datos

### 8.1 User

Representa usuarios del sistema.

Campos esperados:

- id
- email
- password
- fullName
- document
- phone
- globalRole
- companyId opcional según diseño
- refreshToken o hashedRefreshToken
- createdAt
- updatedAt
- deletedAt

Relaciones:

- PropertyUser[]
- Owner[]
- Resident[]
- Payment[]
- AuditLog[]

### 8.2 Company

Empresa administradora.

Campos:

- id
- name
- nit
- status
- createdAt
- updatedAt
- deletedAt

Relaciones:

- users
- properties
- auditLogs

### 8.3 Property

Copropiedad.

Campos:

- id
- companyId
- name
- nit
- address
- city
- department
- phone
- email
- status
- coefficientTotal
- createdAt
- updatedAt
- deletedAt

Relaciones:

- company
- towers
- units
- propertyUsers
- feeConcepts
- fees
- payments
- auditLogs
- lateFeeConfigs

### 8.4 PropertyUser

Tabla de relación para saber qué usuario pertenece a qué copropiedad y con qué rol.

Campos:

- id
- userId
- propertyId
- role
- createdAt
- updatedAt

Uso:

```txt
Un usuario puede tener roles diferentes en copropiedades diferentes.
```

### 8.5 Tower

Torre o bloque.

Campos:

- id
- propertyId
- name
- description
- createdAt
- updatedAt
- deletedAt

Relaciones:

- property
- units

### 8.6 Unit

Unidad privada.

Campos:

- id
- propertyId
- towerId
- code
- floor
- number
- area
- coefficient
- status
- createdAt
- updatedAt
- deletedAt

Relaciones:

- property
- tower
- owners
- residents
- fees
- payments
- auditLogs

### 8.7 Owner

Propietario.

Campos:

- id
- userId opcional
- unitId
- isPrimary
- status
- createdAt
- updatedAt
- deletedAt

Relaciones:

- user
- unit

### 8.8 Resident

Residente.

Campos:

- id
- userId opcional
- unitId
- isPrimary
- status
- createdAt
- updatedAt
- deletedAt

Relaciones:

- user
- unit

---

## 9. Modelos financieros

### 9.1 FeeConcept

Concepto de cobro.

Ejemplos:

- Cuota de administración.
- Cuota extraordinaria.
- Multa.
- Interés de mora.
- Parqueadero.
- Otro.

Campos esperados:

- id
- companyId
- propertyId
- name
- description
- type
- calculationType
- defaultAmount
- active
- createdAt
- updatedAt
- deletedAt

Enums:

```txt
FeeConceptType:
- ADMINISTRATION
- EXTRAORDINARY
- FINE
- INTEREST
- PARKING
- OTHER

CalculationType:
- FIXED
- COEFFICIENT
```

Reglas:

- No debe haber conceptos activos duplicados con el mismo nombre en la misma copropiedad.
- Debe pertenecer a una copropiedad.
- Debe respetar multi-tenancy.

### 9.2 Fee

Representa una cuota, cargo o deuda.

Campos:

- id
- companyId
- propertyId
- unitId
- conceptId
- period
- amount
- paidAmount
- pendingAmount
- dueDate
- status
- notes
- createdAt
- updatedAt
- deletedAt

Estados:

```txt
FeeStatus:
- PENDING
- PARTIAL
- PAID
- OVERDUE
- CANCELLED
```

Reglas:

```txt
paidAmount inicia en 0.
pendingAmount inicia igual a amount.
paidAmount + pendingAmount debe ser igual a amount.
pendingAmount nunca puede ser negativo.
paidAmount nunca puede superar amount.
Si pendingAmount = 0, status = PAID.
Si paidAmount > 0 y pendingAmount > 0, status = PARTIAL.
Si dueDate venció y pendingAmount > 0, status = OVERDUE.
Si status = CANCELLED, no puede recibir pagos.
```

Debe existir constraint:

```txt
@@unique([unitId, conceptId, period])
```

para evitar cuotas duplicadas.

### 9.3 LateFeeConfig

Configuración de mora por copropiedad.

Campos:

- id
- companyId
- propertyId
- interestRate
- interestType
- graceDays
- active
- createdAt
- updatedAt
- deletedAt

Enums:

```txt
InterestType:
- DAILY
- MONTHLY
```

Reglas:

- Cada copropiedad debe tener máximo una configuración activa.
- La mora se calcula sobre pendingAmount.
- No se debe generar mora sobre cuotas PAID o CANCELLED.
- No se debe duplicar mora para la misma cuota y periodo.

### 9.4 Payment

Representa el comprobante de pago subido o registrado.

Campos:

- id
- companyId
- propertyId
- unitId
- userId
- amount
- bankName
- bankReference
- paymentDate
- receiptUrl
- status
- rejectionReason
- reviewedBy
- reviewedAt
- createdAt
- updatedAt
- deletedAt

Estados:

```txt
PaymentStatus:
- PENDING_REVIEW
- APPROVED
- REJECTED
- PARTIAL
```

Reglas:

- Inicia en PENDING_REVIEW.
- No afecta cartera hasta ser aprobado.
- OWNER solo puede crear pagos para sus propias unidades.
- RESIDENT solo puede crear pagos para unidades donde reside.
- ACCOUNTANT, PROPERTY_ADMIN y COMPANY_ADMIN pueden registrar pagos administrativos.
- Debe evitar duplicados de referencia bancaria por copropiedad.

Constraint recomendado:

```txt
@@unique([propertyId, bankReference])
```

### 9.5 PaymentAllocation

Relaciona pagos con cuotas.

Campos:

- id
- paymentId
- feeId
- amountAllocated
- createdAt

Reglas:

```txt
Un pago puede aplicarse a varias cuotas.
Una cuota puede ser pagada con varios pagos.
No se puede asignar más del monto disponible del pago.
No se puede asignar más del pendingAmount de la cuota.
No se puede asignar a cuotas PAID o CANCELLED.
Todas las cuotas asignadas deben pertenecer a la misma unidad, empresa y copropiedad del pago.
```

---

## 10. Reglas financieras críticas

Estas reglas son obligatorias:

```txt
Una cuota nunca debe quedar con saldo negativo.
Un pago nunca debe aplicarse dos veces.
Un propietario nunca debe ver deuda ajena.
Una empresa nunca debe ver cartera de otra.
Un paz y salvo nunca debe generarse con deuda pendiente.
```

### Aprobación de pago

Debe ser transaccional.

Flujo:

```txt
1. Buscar pago.
2. Validar que esté PENDING_REVIEW.
3. Validar tenant.
4. Validar rol autorizado.
5. Determinar cuotas destino.
6. Validar montos.
7. Crear PaymentAllocation.
8. Actualizar paidAmount y pendingAmount de Fee.
9. Actualizar status de Fee.
10. Actualizar status de Payment.
11. Crear AuditLog.
12. Todo dentro de prisma.$transaction.
```

Si algo falla, nada debe quedar modificado.

### Pago automático

Debe aplicar el pago a las cuotas más antiguas primero.

Prioridad sugerida:

```txt
1. Cuotas vencidas más antiguas.
2. Intereses.
3. Cuotas pendientes actuales.
```

### Pago manual

El contador selecciona:

- Cuota.
- Monto a aplicar.

Validaciones:

- La cuota existe.
- La cuota pertenece a la misma unidad del pago.
- La cuota pertenece a la misma copropiedad.
- La cuota no está PAID.
- La cuota no está CANCELLED.
- El monto asignado no supera el saldo pendiente.
- La suma de asignaciones no supera el monto del pago.

### Paz y salvo

Regla recomendada:

```txt
canGenerate = true solamente si:
- totalPending = 0.
- no hay cuotas PENDING.
- no hay cuotas PARTIAL.
- no hay cuotas OVERDUE.
- no hay pagos PENDING_REVIEW que puedan afectar el estado.
```

Si hay pagos pendientes de revisión, debe advertir y no generar paz y salvo automáticamente.

---

## 11. Auditoría

Debe existir una tabla `AuditLog`.

Campos esperados:

- id
- userId
- companyId
- propertyId
- unitId
- entityName
- entityId
- action
- oldValue
- newValue
- ipAddress
- userAgent
- createdAt

Acciones:

```txt
AuditAction:
- CREATE
- UPDATE
- DELETE
- LOGIN
- LOGOUT
- APPROVE
- REJECT
- GENERATE
```

Debe registrar acciones en:

- Login.
- Logout.
- Crear empresa.
- Editar empresa.
- Eliminar empresa.
- Crear copropiedad.
- Editar copropiedad.
- Eliminar copropiedad.
- Crear torre.
- Editar torre.
- Eliminar torre.
- Crear unidad.
- Editar unidad.
- Eliminar unidad.
- Crear propietario.
- Editar propietario.
- Eliminar propietario.
- Crear residente.
- Editar residente.
- Eliminar residente.
- Crear concepto de cobro.
- Generar cuotas.
- Subir pago.
- Aprobar pago.
- Rechazar pago.
- Calcular mora.
- Validar paz y salvo.

---

## 12. Seguridad y multi-tenancy

El sistema debe usar:

- JWT Access Token.
- Refresh Token.
- Hash de contraseña con bcrypt.
- RBAC.
- Guards.
- Decoradores:
  - @Roles()
  - @CurrentUser()
- ValidationPipe global.
- Helmet.
- CORS.
- Rate limiting.

### Reglas de multi-tenancy

```txt
SUPERADMIN puede acceder globalmente.
COMPANY_ADMIN solo accede a su companyId.
PROPERTY_ADMIN solo accede a propertyIds asignados.
ACCOUNTANT solo accede a propertyIds asignados.
SECURITY solo accede a módulos operativos de propertyIds asignados.
OWNER solo accede a unidades propias.
RESIDENT solo accede a unidades donde reside.
```

Nunca se debe confiar en:

```txt
companyId enviado por body.
companyId enviado por query.
propertyId enviado por body sin validación.
```

El `companyId` y `propertyId` deben validarse contra el usuario autenticado y las tablas de pertenencia.

---

## 13. Soft delete

Las entidades principales no deben eliminarse físicamente.

Entidades con `deletedAt`:

- User.
- Company.
- Property.
- Tower.
- Unit.
- Owner.
- Resident.
- FeeConcept.
- Fee.
- Payment.
- LateFeeConfig.

Reglas:

```txt
findMany debe excluir deletedAt != null.
findFirst debe excluir deletedAt != null.
findUnique debe evitarse cuando se necesite validar deletedAt.
update debe validar que el registro no esté eliminado.
delete debe convertirse en update con deletedAt = new Date().
```

---

## 14. Estado técnico actual del proyecto

### 14.1 Estado de Docker y PostgreSQL

Se creó y levantó PostgreSQL para AdminPH.

Puerto usado:

```txt
5434 externo -> 5432 interno del contenedor
```

Motivo:

- Puerto 5432 ya estaba ocupado por PostgreSQL local en Fedora.
- Puerto 5433 ya estaba ocupado por otro proyecto llamado canchasapp-postgres.

Contenedor actual:

```txt
adminph_postgres
```

Conexión funcional probada:

```bash
docker exec -it adminph_postgres psql -U adminph -d adminph_db
```

Credenciales correctas:

```txt
usuario: adminph
password: adminph_password
database: adminph_db
puerto: 5434
```

`DATABASE_URL` correcta:

```env
DATABASE_URL="postgresql://adminph:adminph_password@localhost:5434/adminph_db?schema=public"
```

### 14.2 Estado de Prisma

Se está usando Prisma 7.8.0.

Prisma 7 ya no permite `url = env("DATABASE_URL")` dentro de `schema.prisma`.

Por eso el datasource debe quedar así:

```prisma
datasource db {
  provider = "postgresql"
}
```

Y debe existir `prisma.config.ts`:

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    url: env("DATABASE_URL")
  }
});
```

Comandos ya ejecutados exitosamente:

```bash
npx prisma format
npx prisma validate
npx prisma generate
npx prisma migrate dev --name init
```

Resultado:

```txt
prisma validate: OK
prisma generate: OK
migrate dev --name init: OK
database in sync with schema
```

Migración aplicada:

```txt
20260509032323_init
```

### 14.3 Estado de npm / NestJS

Se detectó que inicialmente no existía `package.json`.

Se creó `package.json`, `tsconfig.json`, `nest-cli.json`, `prisma.config.ts`, `.env` y se instalaron dependencias.

Pero actualmente:

```bash
npm run build
```

falla con muchos errores TypeScript.

El proyecto todavía no compila.

---

## 15. Errores actuales de build

Al ejecutar:

```bash
npm run build
```

aparecieron aproximadamente 105 errores.

Los grupos principales de errores son:

### 15.1 Error en seed.ts

Error:

```txt
Property 'disconnect' does not exist on type 'typeof PrismaClient'
```

Causa probable:

```ts
await PrismaClient.disconnect();
```

Solución correcta:

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 15.2 Error en tenancy.interceptor.ts

Error:

```txt
"@nestjs/common" has no exported member named 'HttpResponse'
```

Solución:

Eliminar `HttpResponse` del import.

Import correcto:

```ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
```

### 15.3 Imports incorrectos de PrismaService

Muchos archivos tienen imports como:

```ts
import { PrismaService } from "../modules/prisma/prisma.service";
```

Pero desde `src/modules/auth/auth.service.ts`, `src/modules/users/users.service.ts`, etc., debe ser:

```ts
import { PrismaService } from "../prisma/prisma.service";
```

Desde `src/modules/audit/audit.service.ts` también debe ser:

```ts
import { PrismaService } from "../prisma/prisma.service";
```

Desde `src/core/middleware/tenancy.interceptor.ts`, para importar AuditService debe ser:

```ts
import { AuditService } from "../../modules/audit/audit.service";
```

### 15.4 prisma-extension.ts usa APIs inválidas

Errores:

```txt
Prisma.extension does not exist.
client.$type does not exist.
```

Solución temporal recomendada:

Desactivar la extensión para lograr compilación.

`src/core/prisma/prisma-extension.ts`:

```ts
export const softDeleteExtension = null;
```

Y dejar `PrismaService` simple:

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### 15.5 main.ts usa APIs incorrectas

Errores:

```txt
useGlobalGuard does not exist. Did you mean useGlobalGuards?
getGuard does not exist on ThrottlerModule.
```

Solución:

- Cambiar `useGlobalGuard` por `useGlobalGuards` si aplica.
- No usar `app.get(ThrottlerModule).getGuard()`.
- Configurar throttling desde `AppModule` o usando `APP_GUARD`.
- Para compilar rápido, eliminar temporalmente ese bloque.

### 15.6 AuthController accede a prisma privado

Error:

```txt
Property 'prisma' is private and only accessible within class 'AuthService'
```

Causa:

```ts
this.authService.prisma.user.findUnique(...)
```

Solución:

Crear métodos públicos en `AuthService`, por ejemplo:

```ts
getUserById(id: string) {
  return this.prisma.user.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });
}

logout(userId: string) {
  return this.prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
}
```

Y el controller debe llamar esos métodos, no acceder directamente a Prisma.

### 15.7 Controllers no pasan user/request a services

Muchos servicios esperan:

```ts
create(dto, user, request)
update(id, dto, user, request)
remove(id, user, request)
```

Pero los controllers llaman:

```ts
this.service.create(dto)
this.service.update(id, dto)
this.service.remove(id)
```

Solución:

Agregar en controllers:

```ts
@CurrentUser() user: any
@Req() request: any
```

Ejemplo:

```ts
@Post()
create(
  @Body() dto: CreateCompanyDto,
  @CurrentUser() user: any,
  @Req() request: any,
) {
  return this.companiesService.create(dto, user, request);
}
```

Importar:

```ts
import { Req } from "@nestjs/common";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
```

### 15.8 CurrentUser no está importado

Error:

```txt
Cannot find name 'CurrentUser'
```

Solución en controllers:

```ts
import { CurrentUser } from "../../core/decorators/current-user.decorator";
```

### 15.9 AuditLogParams no acepta request

Muchos errores:

```txt
Object literal may only specify known properties, and 'request' does not exist in type 'AuditLogParams'
```

Solución:

Actualizar interfaz en `audit.service.ts`:

```ts
export interface AuditLogParams {
  userId?: string;
  companyId?: string;
  propertyId?: string;
  unitId?: string;
  entityName: string;
  entityId: string;
  action: any;
  oldValue?: any;
  newValue?: any;
  request?: any;
}
```

Y mapear:

```ts
ipAddress: params.request?.ip,
userAgent: params.request?.headers?.["user-agent"],
```

### 15.10 Error de escritura en fees.service.ts

Error:

```txt
export la class FeesService
```

Debe ser:

```ts
export class FeesService
```

### 15.11 finance.module.ts importa archivos inexistentes

Errores:

```txt
Cannot find module './finance.controller'
Cannot find module './finance.service'
```

Soluciones posibles:

- Crear archivos mínimos `finance.controller.ts` y `finance.service.ts`.
- O eliminar esos imports si no se usan.

### 15.12 Schema Prisma no coincide con services financieros

Errores indican que los services esperan campos que no existen en Prisma Client:

```txt
InterestType no existe.
LateFeeConfig no existe.
companyId no existe en FeeConcept.
deletedAt no existe en FeeConcept.
calculationType no existe.
defaultAmount no existe.
companyId no existe en Fee o Payment.
```

Solución recomendada:

Alinear `schema.prisma` con lo que usan los services.

Debe existir:

```prisma
enum FeeConceptType {
  ADMINISTRATION
  EXTRAORDINARY
  FINE
  INTEREST
  PARKING
  OTHER
}

enum CalculationType {
  FIXED
  COEFFICIENT
}

enum InterestType {
  DAILY
  MONTHLY
}
```

`FeeConcept` debería tener:

```prisma
model FeeConcept {
  id              String           @id @default(cuid())
  companyId       String
  company         Company          @relation(fields: [companyId], references: [id])
  propertyId      String
  property        Property         @relation(fields: [propertyId], references: [id])
  name            String
  description     String?
  type            FeeConceptType
  calculationType CalculationType
  defaultAmount   Decimal?         @db.Decimal(18, 2)
  active          Boolean          @default(true)

  fees            Fee[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([companyId])
  @@index([propertyId])
}
```

`LateFeeConfig` debería existir:

```prisma
model LateFeeConfig {
  id           String       @id @default(cuid())
  companyId    String
  company      Company      @relation(fields: [companyId], references: [id])
  propertyId   String
  property     Property     @relation(fields: [propertyId], references: [id])
  interestRate Decimal      @db.Decimal(10, 4)
  interestType InterestType
  graceDays    Int          @default(0)
  active       Boolean      @default(true)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([companyId])
  @@index([propertyId])
}
```

### 15.13 tsconfig baseUrl deprecado

Error:

```txt
Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0.
```

Solución:

Agregar:

```json
"ignoreDeprecations": "6.0"
```

en `compilerOptions`.

---

## 16. Estado actual resumido

Lo que ya está bien:

```txt
Docker PostgreSQL en puerto 5434: OK.
Conexión a PostgreSQL: OK.
.env corregido: OK.
prisma.config.ts para Prisma 7: OK.
schema.prisma validado: OK.
Prisma Client generado: OK.
Migración init aplicada: OK.
```

Lo que falta:

```txt
npm run build falla.
NestJS no compila todavía.
Hay errores de imports, controllers, services, auditoría y schema/services no alineados.
No ejecutar start:dev hasta que build pase.
```

---

## 17. Prioridad inmediata

La prioridad no es frontend ni nuevos módulos.

La prioridad inmediata es:

```txt
Lograr que npm run build pase sin errores.
```

Orden sugerido:

1. Arreglar `fees.service.ts` typo.
2. Arreglar `seed.ts`.
3. Arreglar `tsconfig.json`.
4. Simplificar `PrismaService`.
5. Desactivar temporalmente `prisma-extension.ts`.
6. Arreglar imports de PrismaService.
7. Arreglar `main.ts`.
8. Arreglar `AuditLogParams`.
9. Arreglar controllers para pasar user/request.
10. Alinear schema Prisma con services financieros.
11. Ejecutar:
   ```bash
   npx prisma format
   npx prisma validate
   npx prisma generate
   npm run build
   ```

---

## 18. Prompt recomendado para el nuevo LLM

Usar este prompt para continuar con otro LLM:

```txt
Estoy trabajando en AdminPH, un SaaS web multiempresa para administración de propiedad horizontal en Colombia.

Ya tengo PostgreSQL en Docker funcionando en el puerto 5434, Prisma 7 configurado con prisma.config.ts, schema.prisma validado, cliente Prisma generado y migración inicial aplicada.

El objetivo inmediato NO es crear nuevas funcionalidades ni frontend.

El objetivo inmediato es corregir el backend NestJS para que npm run build pase sin errores.

El backend tiene errores de compilación porque fue generado por partes y hay inconsistencias entre controllers, services, Prisma y DTOs.

Necesito que hagas una fase de "compilation fix".

Restricciones:
- No implementar frontend.
- No agregar funcionalidades nuevas.
- No romper Prisma 7.
- No volver a poner url en datasource de schema.prisma.
- Mantener prisma.config.ts.
- Mantener PostgreSQL en puerto 5434.
- Mantener DATABASE_URL:
  postgresql://adminph:adminph_password@localhost:5434/adminph_db?schema=public
- No eliminar multi-tenancy ni auditoría.
- Si algo está incompleto, dejarlo simple pero compilable.

Errores principales a corregir:
1. prisma/seed.ts usa PrismaClient.disconnect() pero debe usar instancia prisma.$disconnect().
2. tenancy.interceptor.ts importa HttpResponse desde @nestjs/common, pero no existe.
3. Hay imports incorrectos como ../modules/prisma/prisma.service desde archivos dentro de src/modules. Deben corregirse a ../prisma/prisma.service o rutas relativas correctas.
4. prisma-extension.ts usa Prisma.extension y client.$type, APIs inválidas. Simplificar PrismaService para extender PrismaClient sin helpers genéricos por ahora.
5. main.ts usa app.useGlobalGuard y app.get(ThrottlerModule).getGuard(), APIs incorrectas.
6. AuthController accede a authService.prisma aunque prisma es privado. Crear métodos públicos en AuthService para profile/logout.
7. Controllers llaman services sin pasar user/request, pero services esperan user/request. Agregar @CurrentUser() y @Req() en controllers.
8. Importar CurrentUser correctamente en controllers.
9. AuditLogParams no acepta request. Agregar request?: any y mapear ipAddress/userAgent en AuditService.
10. fees.service.ts tiene typo: export la class FeesService. Debe ser export class FeesService.
11. finance.module.ts importa finance.controller y finance.service que no existen. Crear archivos mínimos o eliminar esos imports.
12. schema.prisma no coincide con services financieros: faltan InterestType, LateFeeConfig, companyId/deletedAt/calculationType/defaultAmount en FeeConcept, companyId en Fee/Payment si los services lo usan. Alinear schema o services, pero debe compilar.
13. tsconfig debe incluir ignoreDeprecations: "6.0".

Entrega esperada:
- Lista de archivos modificados.
- Código corregido de archivos principales.
- Comandos para ejecutar.
- Confirmar que npm run build pase.
```

---

## 19. Comandos útiles

### Verificar Docker

```bash
docker ps
```

### Entrar a PostgreSQL AdminPH

```bash
docker exec -it adminph_postgres psql -U adminph -d adminph_db
```

### Prisma

```bash
npx prisma format
npx prisma validate
npx prisma generate
npx prisma migrate dev --name nombre_migracion
npx prisma db seed
```

### Build

```bash
npm run build
```

### Start dev

Solo ejecutar cuando build pase:

```bash
npm run start:dev
```

---

## 20. Regla principal para continuar

Antes de crear frontend o nuevos módulos:

```txt
El backend debe compilar.
Prisma debe validar.
Prisma Client debe generarse.
La app NestJS debe arrancar.
Swagger debe abrir.
Login debe funcionar.
Los endpoints protegidos deben responder correctamente.
```

No avanzar a frontend hasta resolver `npm run build`.

---

## 21. Concepto comercial del producto

AdminPH busca ser una alternativa moderna para empresas administradoras de propiedad horizontal en Colombia, permitiendo digitalizar procesos que muchas veces se manejan en Excel, WhatsApp, papel o software contable genérico.

Valor principal:

```txt
Centralizar administración, cartera, pagos, estados de cuenta y comunicación en una sola plataforma SaaS.
```

Problemas que resuelve:

- Falta de transparencia en cartera.
- Dificultad para validar pagos.
- Estados de cuenta manuales.
- Paz y salvo manual.
- Duplicidad de comprobantes.
- Mala trazabilidad.
- Información dispersa.
- Procesos lentos de administración.
- Falta de acceso para propietarios.
- Riesgo de errores financieros.
- Dificultad para administrar varias copropiedades.

Cliente objetivo:

- Empresas administradoras de propiedad horizontal.
- Administradores independientes.
- Conjuntos residenciales.
- Edificios de apartamentos.
- Consejos de administración.

---

## 22. Recomendación de desarrollo por fases

### Fase actual

```txt
Estabilizar backend y lograr build.
```

### Fase siguiente

```txt
Probar endpoints en Swagger/Postman.
```

### Luego

```txt
Frontend MVP.
```

### Después

```txt
PQR, comunicados y reservas.
```

### Luego

```txt
Portería, visitantes, vehículos y mascotas.
```

### Después

```txt
Asambleas, votaciones y actas.
```

### Finalmente

```txt
Pasarela de pagos, PSE, WhatsApp, email, PDF/Excel, facturación o integración contable.
```
