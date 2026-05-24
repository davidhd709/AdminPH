import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
import { publicGuard } from "./core/guards/public.guard";

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
