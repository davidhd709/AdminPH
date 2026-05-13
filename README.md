# AdminPH Backend - Base Setup

## 🚀 Quick Start

### 1. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and JWT secrets.

### 2. Infrastructure

Start the database using Docker:

```bash
docker-compose up -d
```

### 3. Installation

```bash
cd backend
npm install
```

### 4. Database Initialization

Run migrations and seed the database:

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Run Application

```bash
npm run start:dev
```

## 🛠 Architecture Overview

- **Multi-tenancy:** Data is isolated by `companyId` and `propertyId`.
- **RBAC:** Role-Based Access Control implemented via `@Roles()` decorator and `RolesGuard`.
- **Soft Delete:** Entities use `deletedAt` for logical deletion.
- **Audit:** All critical changes are tracked in the `AuditLog` table.

## 📂 Project Structure

- `src/core`: Global guards, decorators, and middleware.
- `src/modules`: Domain-driven modules (auth, users, finance, etc.).
- `prisma/schema.prisma`: Single source of truth for the database model.
