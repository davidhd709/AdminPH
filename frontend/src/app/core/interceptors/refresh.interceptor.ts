import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from "@angular/common/http";
import { inject } from "@angular/core";
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from "rxjs";
import { TokenService } from "../auth/token.service";
import { AuthService } from "../auth/auth.service";
import { API } from "../config/api.config";

/**
 * Refresh-token transparente ante un 401.
 *
 * Flujo: si una request a la API responde 401 (y no es un endpoint de auth),
 * intenta rotar el refresh token UNA sola vez y reintenta la request original
 * con el nuevo access token. Durante el refresh, las demás requests 401 quedan
 * en cola (refreshing$) y se reanudan cuando llega el token nuevo. Si el
 * refresh falla, se limpia la sesión y se propaga el error (el errorInterceptor
 * redirige a /login).
 *
 * Debe ir DESPUÉS de authInterceptor y ANTES de errorInterceptor.
 */

// Estado compartido a nivel de módulo (single-flight del refresh).
let isRefreshing = false;
const refreshed$ = new BehaviorSubject<string | null>(null);

const AUTH_PATHS = [API.auth.login, API.auth.refresh, API.auth.forgotPassword, API.auth.resetPassword];

function withToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenService);
  const auth = inject(AuthService);

  const isApi = req.url.startsWith(API.baseUrl);
  const isAuthCall = AUTH_PATHS.some((p) => req.url.endsWith(p));

  if (!isApi || isAuthCall) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || !tokens.getRefreshToken()) {
        return throwError(() => error);
      }

      // Ya hay un refresh en curso: encolar hasta que termine.
      if (isRefreshing) {
        return refreshed$.pipe(
          filter((token): token is string => token !== null),
          take(1),
          switchMap((token) => next(withToken(req, token))),
        );
      }

      // Iniciar refresh (single-flight).
      isRefreshing = true;
      refreshed$.next(null);

      return auth.refresh().pipe(
        switchMap((pair) => {
          isRefreshing = false;
          refreshed$.next(pair.access_token);
          return next(withToken(req, pair.access_token));
        }),
        catchError((refreshErr) => {
          isRefreshing = false;
          auth.clearSession();
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
