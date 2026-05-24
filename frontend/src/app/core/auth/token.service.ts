import { Injectable } from "@angular/core";
import { TokenPair } from "./auth.models";

const ACCESS_KEY = "adminph.access";
const REFRESH_KEY = "adminph.refresh";

/**
 * Manejo de tokens en localStorage.
 *
 * Nota de seguridad: localStorage es vulnerable a XSS. Para producción
 * endurecida se recomienda mover los tokens a cookies httpOnly emitidas por
 * el backend. Se centraliza aquí para poder cambiar la estrategia en un solo
 * lugar. El frontend NUNCA guarda secretos de servidor, solo tokens de sesión.
 */
@Injectable({ providedIn: "root" })
export class TokenService {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  setTokens(tokens: TokenPair): void {
    localStorage.setItem(ACCESS_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  }

  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }

  hasSession(): boolean {
    return !!this.getAccessToken();
  }
}
