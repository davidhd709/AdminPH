import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, map, tap } from "rxjs";
import { API } from "../config/api.config";
import { TokenService } from "./token.service";
import { AuthStore } from "./auth.store";
import {
  AuthUser,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  ResetPasswordRequest,
  TokenPair,
  UserRole,
} from "./auth.models";

/** Shape crudo de GET /users/me en el backend (usa `globalRole`). */
interface MeResponse {
  id: string;
  email: string;
  fullName: string;
  globalRole: UserRole;
  companyId?: string | null;
}

/**
 * Orquesta el flujo de autenticación contra el backend (/api/v1/auth).
 * Mantiene el AuthStore (signals) y los tokens sincronizados.
 */
@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenService);
  private readonly store = inject(AuthStore);

  private url(path: string): string {
    return `${API.baseUrl}${path}`;
  }

  login(payload: LoginRequest): Observable<LoginResponse> {
    this.store.setLoading(true);
    return this.http.post<LoginResponse>(this.url(API.auth.login), payload).pipe(
      tap({
        next: (res) => {
          this.tokens.setTokens({
            access_token: res.access_token,
            refresh_token: res.refresh_token,
          });
          this.store.setUser({
            id: res.user.id,
            email: res.user.email,
            fullName: res.user.fullName,
            role: res.user.role,
          });
          this.store.setLoading(false);
        },
        error: () => this.store.setLoading(false),
      }),
    );
  }

  /** Rota el refresh token. Lo usa el interceptor ante un 401. */
  refresh(): Observable<TokenPair> {
    const refresh_token = this.tokens.getRefreshToken();
    return this.http
      .post<TokenPair>(this.url(API.auth.refresh), { refresh_token })
      .pipe(tap((res) => this.tokens.setTokens(res)));
  }

  /** Carga el usuario actual (al rehidratar sesión desde un token guardado). */
  loadCurrentUser(): Observable<AuthUser> {
    return this.http.get<MeResponse>(this.url(API.users.me)).pipe(
      map(
        (me): AuthUser => ({
          id: me.id,
          email: me.email,
          fullName: me.fullName,
          role: me.globalRole,
          companyId: me.companyId ?? null,
        }),
      ),
      tap((user) => this.store.setUser(user)),
    );
  }

  forgotPassword(payload: ForgotPasswordRequest): Observable<void> {
    return this.http.post<void>(this.url(API.auth.forgotPassword), payload);
  }

  resetPassword(payload: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>(this.url(API.auth.resetPassword), payload);
  }

  logout(): Observable<unknown> {
    return this.http.post(this.url(API.auth.logout), {}).pipe(
      tap({
        next: () => this.clearSession(),
        error: () => this.clearSession(),
      }),
    );
  }

  clearSession(): void {
    this.tokens.clear();
    this.store.clear();
  }
}
