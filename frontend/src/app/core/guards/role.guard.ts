import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthStore } from "../auth/auth.store";
import { UserRole } from "../auth/auth.models";

/**
 * Guard de rol parametrizado. Uso en rutas:
 *   { path: "...", canActivate: [roleGuard("SUPERADMIN", "COMPANY_ADMIN")] }
 * Sin el rol requerido -> redirige a /403.
 */
export function roleGuard(...allowed: UserRole[]): CanActivateFn {
  return () => {
    const store = inject(AuthStore);
    const router = inject(Router);

    if (store.hasRole(...allowed)) return true;

    return router.createUrlTree(["/403"]);
  };
}
