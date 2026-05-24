import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { TokenService } from "../auth/token.service";

/** Protege rutas que requieren sesión. Sin token -> redirige a /login. */
export const authGuard: CanActivateFn = (_route, state) => {
  const tokens = inject(TokenService);
  const router = inject(Router);

  if (tokens.hasSession()) return true;

  return router.createUrlTree(["/login"], {
    queryParams: { returnUrl: state.url },
  });
};
