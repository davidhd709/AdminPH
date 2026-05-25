import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, tap } from "rxjs";
import { API } from "../../core/config/api.config";
import { AuthStore } from "../../core/auth/auth.store";
import { AppUser } from "../users/user.models";

export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

/**
 * Operaciones del propio usuario (/users/me): ver/editar perfil y cambiar
 * contraseña. Sirve a cualquier rol. Al editar el perfil sincroniza el
 * AuthStore para que el topbar refleje el nuevo nombre.
 */
@Injectable({ providedIn: "root" })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(AuthStore);
  private readonly meUrl = `${API.baseUrl}${API.users.me}`;

  getMe(): Observable<AppUser> {
    return this.http.get<AppUser>(this.meUrl);
  }

  updateMe(payload: UpdateProfilePayload): Observable<AppUser> {
    return this.http.patch<AppUser>(this.meUrl, payload).pipe(
      tap((u) =>
        this.store.setUser({
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          role: u.globalRole,
          companyId: u.companyId ?? null,
        }),
      ),
    );
  }

  changePassword(payload: ChangePasswordPayload): Observable<void> {
    return this.http.post<void>(`${API.baseUrl}${API.users.changePassword}`, payload);
  }
}
