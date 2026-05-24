import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { TokenService } from "../auth/token.service";

/** Para rutas públicas (login, etc.). Con sesión activa -> va al dashboard. */
export const publicGuard: CanActivateFn = () => {
  const tokens = inject(TokenService);
  const router = inject(Router);

  if (!tokens.hasSession()) return true;

  return router.createUrlTree(["/app/dashboard"]);
};
