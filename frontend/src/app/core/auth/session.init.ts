import { inject } from "@angular/core";
import { catchError, of } from "rxjs";
import { firstValueFrom } from "rxjs";
import { AuthService } from "./auth.service";
import { TokenService } from "./token.service";

/**
 * Rehidratación de sesión al arrancar la app: si hay un access token guardado,
 * intenta cargar el usuario actual (/users/me) para poblar el AuthStore.
 *
 * Si el token expiró, el refreshInterceptor intentará rotarlo de forma
 * transparente durante este request. Si todo falla, se limpia la sesión
 * (el usuario quedará deslogueado y los guards lo enviarán a /login).
 *
 * Se registra con provideAppInitializer en app.config.ts.
 */
export async function initSession(): Promise<void> {
  const tokens = inject(TokenService);
  const auth = inject(AuthService);

  if (!tokens.hasSession()) return;

  await firstValueFrom(
    auth.loadCurrentUser().pipe(
      catchError(() => {
        auth.clearSession();
        return of(null);
      }),
    ),
  );
}
