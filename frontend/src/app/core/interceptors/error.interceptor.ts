import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { MessageService } from "primeng/api";
import { catchError, throwError } from "rxjs";
import { TokenService } from "../auth/token.service";
import { AuthStore } from "../auth/auth.store";
import { API } from "../config/api.config";

/**
 * Manejo centralizado de errores HTTP:
 *  - 401: limpia sesión y manda a /login (salvo en el propio login).
 *  - 403: toast de acceso denegado.
 *  - 5xx / red: toast genérico.
 * Muestra mensajes con PrimeNG MessageService (toast global).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokens = inject(TokenService);
  const store = inject(AuthStore);
  const messages = inject(MessageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isLoginCall = req.url.endsWith(API.auth.login);

      if (error.status === 401 && !isLoginCall) {
        tokens.clear();
        store.clear();
        void router.navigate(["/login"]);
      } else if (error.status === 403) {
        messages.add({
          severity: "warn",
          summary: "Acceso denegado",
          detail: "No tienes permisos para esta acción.",
        });
      } else if (error.status === 0) {
        messages.add({
          severity: "error",
          summary: "Sin conexión",
          detail: "No se pudo contactar al servidor.",
        });
      } else if (error.status >= 500) {
        messages.add({
          severity: "error",
          summary: "Error del servidor",
          detail: "Ocurrió un error inesperado. Intenta más tarde.",
        });
      }

      return throwError(() => error);
    }),
  );
};
