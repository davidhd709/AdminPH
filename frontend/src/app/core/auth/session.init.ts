import { HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, firstValueFrom, of } from "rxjs";
import { AuthService } from "./auth.service";
import { TokenService } from "./token.service";

/**
 * ¿El error es transitorio (no implica que la sesión sea inválida)?
 * Cubre rate-limit (429), errores de servidor (5xx) y fallo de red (status 0).
 * Un error así NO debe expulsar al usuario: la sesión sigue siendo válida.
 */
export function isTransientError(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) return false;
  return error.status === 429 || error.status === 0 || error.status >= 500;
}

/**
 * Rehidratación de sesión al arrancar la app: si hay un access token guardado,
 * intenta cargar el usuario actual (/users/me) para poblar el AuthStore.
 *
 * Si el token expiró, el refreshInterceptor intentará rotarlo de forma
 * transparente durante este request. Solo un fallo de AUTENTICACIÓN real
 * (p. ej. 401 con refresh fallido) limpia la sesión y deja que los guards
 * envíen a /login. Un error transitorio (429 por rate-limit, 5xx o red) NO
 * invalida la sesión: se preservan los tokens para no expulsar al usuario.
 *
 * Se registra con provideAppInitializer en app.config.ts.
 */
export async function initSession(): Promise<void> {
  const tokens = inject(TokenService);
  const auth = inject(AuthService);

  if (!tokens.hasSession()) return;

  await firstValueFrom(
    auth.loadCurrentUser().pipe(
      catchError((error: unknown) => {
        if (!isTransientError(error)) auth.clearSession();
        return of(null);
      }),
    ),
  );
}
