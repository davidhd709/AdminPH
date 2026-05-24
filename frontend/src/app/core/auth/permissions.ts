import { UserRole } from "./auth.models";

/**
 * Claves de permiso de la app. Se mapean a roles en ROLE_PERMISSIONS.
 * Los componentes/menús consultan permisos por clave, NUNCA por rol directo
 * (evita hardcodear roles en templates y centraliza la política).
 */
export type Permission =
  | "dashboard.view"
  | "companies.manage"
  | "properties.manage"
  | "towers.manage"
  | "units.manage"
  | "people.manage"
  | "finance.manage"
  | "concepts.manage"
  | "payments.manage"
  | "payments.submit"
  | "statements.view"
  | "reports.view"
  | "pqr.manage"
  | "pqr.submit"
  | "announcements.manage"
  | "announcements.view"
  | "reservations.manage"
  | "reservations.book"
  | "security.manage"
  | "assemblies.manage"
  | "documents.view"
  | "accounting.manage"
  | "myunit.view";

/** Política de permisos por rol (single source of truth). */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPERADMIN: [
    "dashboard.view",
    "companies.manage",
    "properties.manage",
    "towers.manage",
    "units.manage",
    "people.manage",
    "finance.manage",
    "concepts.manage",
    "payments.manage",
    "statements.view",
    "reports.view",
    "pqr.manage",
    "announcements.manage",
    "reservations.manage",
    "security.manage",
    "assemblies.manage",
    "documents.view",
    "accounting.manage",
  ],
  COMPANY_ADMIN: [
    "dashboard.view",
    "properties.manage",
    "towers.manage",
    "concepts.manage",
    "people.manage",
    "reports.view",
    "announcements.manage",
    "documents.view",
    "accounting.manage",
  ],
  PROPERTY_ADMIN: [
    "dashboard.view",
    "towers.manage",
    "units.manage",
    "concepts.manage",
    "people.manage",
    "pqr.manage",
    "reservations.manage",
    "announcements.manage",
    "documents.view",
  ],
  ACCOUNTANT: [
    "dashboard.view",
    "finance.manage",
    "payments.manage",
    "statements.view",
    "reports.view",
    "accounting.manage",
  ],
  SECURITY: ["dashboard.view", "security.manage"],
  OWNER: [
    "dashboard.view",
    "myunit.view",
    "statements.view",
    "payments.submit",
    "pqr.submit",
    "reservations.book",
    "announcements.view",
    "documents.view",
  ],
  RESIDENT: [
    "dashboard.view",
    "myunit.view",
    "pqr.submit",
    "reservations.book",
    "announcements.view",
  ],
};

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
