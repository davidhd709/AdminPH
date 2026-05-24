import { Injectable, computed, signal } from "@angular/core";
import { AuthUser, UserRole } from "./auth.models";

/**
 * Estado de autenticación reactivo con Signals.
 * Fuente única de verdad del usuario actual en el frontend.
 */
@Injectable({ providedIn: "root" })
export class AuthStore {
  private readonly _user = signal<AuthUser | null>(null);
  private readonly _loading = signal<boolean>(false);

  /** Usuario actual (readonly). */
  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly role = computed<UserRole | null>(() => this._user()?.role ?? null);
  readonly companyId = computed<string | null>(() => this._user()?.companyId ?? null);

  setUser(user: AuthUser | null): void {
    this._user.set(user);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  clear(): void {
    this._user.set(null);
  }

  /** ¿El usuario tiene alguno de los roles indicados? */
  hasRole(...roles: UserRole[]): boolean {
    const current = this._user()?.role;
    return current ? roles.includes(current) : false;
  }
}
