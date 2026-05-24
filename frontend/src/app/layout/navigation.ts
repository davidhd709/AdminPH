import { Permission } from "../core/auth/permissions";

export interface NavItem {
  label: string;
  icon: string; // clase PrimeIcons (pi pi-*)
  route: string;
  /** Permiso requerido para ver el item. Si se omite, visible para todos. */
  permission?: Permission;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

/**
 * Definición completa del menú lateral. El sidebar filtra por permiso según
 * el rol del usuario (ver permissions.ts). Las rutas que aún no existen
 * llevan a páginas placeholder o quedan listas para fases siguientes.
 */
export const NAVIGATION: NavSection[] = [
  {
    items: [{ label: "Dashboard", icon: "pi pi-home", route: "/app/dashboard", permission: "dashboard.view" }],
  },
  {
    title: "Administración",
    items: [
      { label: "Empresas", icon: "pi pi-building", route: "/app/companies", permission: "companies.manage" },
      { label: "Copropiedades", icon: "pi pi-building-columns", route: "/app/properties", permission: "properties.manage" },
      { label: "Torres", icon: "pi pi-th-large", route: "/app/towers", permission: "towers.manage" },
      { label: "Unidades", icon: "pi pi-home", route: "/app/units", permission: "units.manage" },
      { label: "Propietarios y residentes", icon: "pi pi-users", route: "/app/people", permission: "people.manage" },
    ],
  },
  {
    title: "Finanzas",
    items: [
      { label: "Cuotas y conceptos", icon: "pi pi-wallet", route: "/app/finance/concepts", permission: "concepts.manage" },
      { label: "Pagos", icon: "pi pi-credit-card", route: "/app/payments", permission: "payments.manage" },
      { label: "Contabilidad", icon: "pi pi-calculator", route: "/app/accounting", permission: "accounting.manage" },
      { label: "Reportes", icon: "pi pi-chart-bar", route: "/app/reports", permission: "reports.view" },
    ],
  },
  {
    title: "Operación",
    items: [
      { label: "PQR", icon: "pi pi-comments", route: "/app/pqr", permission: "pqr.manage" },
      { label: "Comunicados", icon: "pi pi-megaphone", route: "/app/announcements", permission: "announcements.manage" },
      { label: "Reservas", icon: "pi pi-calendar", route: "/app/reservations", permission: "reservations.manage" },
      { label: "Portería", icon: "pi pi-shield", route: "/app/security", permission: "security.manage" },
      { label: "Asambleas", icon: "pi pi-flag", route: "/app/assemblies", permission: "assemblies.manage" },
      { label: "Documentos", icon: "pi pi-folder", route: "/app/documents", permission: "documents.view" },
    ],
  },
  {
    title: "Mi cuenta",
    items: [
      { label: "Mi unidad", icon: "pi pi-home", route: "/app/my-unit", permission: "myunit.view" },
      { label: "Estado de cuenta", icon: "pi pi-file", route: "/app/statements", permission: "statements.view" },
      { label: "Mis PQR", icon: "pi pi-comment", route: "/app/pqr", permission: "pqr.submit" },
      { label: "Reservar", icon: "pi pi-calendar-plus", route: "/app/reservations", permission: "reservations.book" },
      { label: "Comunicados", icon: "pi pi-megaphone", route: "/app/announcements", permission: "announcements.view" },
    ],
  },
];
