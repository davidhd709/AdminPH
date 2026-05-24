import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
import { publicGuard } from "./core/guards/public.guard";
import { roleGuard } from "./core/guards/role.guard";

export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "app/dashboard" },

  // ===== Públicas (auth) =====
  {
    path: "login",
    canActivate: [publicGuard],
    loadComponent: () => import("./features/auth/pages/login/login").then((m) => m.Login),
  },
  {
    path: "forgot-password",
    canActivate: [publicGuard],
    loadComponent: () =>
      import("./features/auth/pages/forgot-password/forgot-password").then((m) => m.ForgotPassword),
  },
  {
    path: "reset-password",
    canActivate: [publicGuard],
    loadComponent: () =>
      import("./features/auth/pages/reset-password/reset-password").then((m) => m.ResetPassword),
  },

  // ===== Privadas (shell + dashboard) =====
  {
    path: "app",
    canActivate: [authGuard],
    loadComponent: () => import("./layout/shell/shell").then((m) => m.Shell),
    children: [
      { path: "", pathMatch: "full", redirectTo: "dashboard" },
      {
        path: "dashboard",
        loadComponent: () => import("./features/dashboard/dashboard").then((m) => m.Dashboard),
      },
      // Ruta de módulo de referencia: protegida por rol (solo SUPERADMIN).
      // Patrón a replicar por los módulos de fases siguientes.
      {
        path: "companies",
        canActivate: [roleGuard("SUPERADMIN")],
        loadComponent: () => import("./features/companies/companies").then((m) => m.Companies),
      },
      {
        path: "properties",
        canActivate: [roleGuard("SUPERADMIN", "COMPANY_ADMIN")],
        loadComponent: () => import("./features/properties/properties").then((m) => m.Properties),
      },
      {
        path: "towers",
        canActivate: [roleGuard("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")],
        loadComponent: () => import("./features/towers/towers").then((m) => m.Towers),
      },
      {
        path: "units",
        canActivate: [roleGuard("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")],
        loadComponent: () => import("./features/units/units").then((m) => m.Units),
      },
      {
        path: "people",
        canActivate: [roleGuard("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")],
        loadComponent: () => import("./features/people/people").then((m) => m.People),
      },
      {
        path: "finance/concepts",
        canActivate: [roleGuard("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")],
        loadComponent: () => import("./features/concepts/concepts").then((m) => m.Concepts),
      },
      {
        path: "finance/payments",
        canActivate: [roleGuard("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")],
        loadComponent: () => import("./features/payments/payments").then((m) => m.Payments),
      },
      {
        path: "finance/accounting",
        canActivate: [roleGuard("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")],
        loadComponent: () => import("./features/accounting/accounting").then((m) => m.Accounting),
      },
      {
        path: "finance/reports",
        canActivate: [roleGuard("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")],
        loadComponent: () => import("./features/reports/reports").then((m) => m.Reports),
      },
    ],
  },

  // ===== Errores =====
  {
    path: "403",
    loadComponent: () => import("./features/errors/forbidden/forbidden").then((m) => m.Forbidden),
  },
  {
    path: "404",
    loadComponent: () => import("./features/errors/not-found/not-found").then((m) => m.NotFound),
  },
  { path: "**", redirectTo: "404" },
];
