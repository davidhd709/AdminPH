import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { API } from "../../core/config/api.config";
import { PageQuery, PaginatedResult, toHttpParams } from "../../core/http/pagination";
import { AppUser } from "./user.models";

/** Acceso de solo lectura al listado de usuarios (/api/v1/users). */
@Injectable({ providedIn: "root" })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API.baseUrl}${API.users.base}`;

  list(query: PageQuery & { search?: string }): Observable<PaginatedResult<AppUser>> {
    let params = toHttpParams(query);
    if (query.search?.trim()) params = params.set("search", query.search.trim());
    return this.http.get<PaginatedResult<AppUser>>(this.base, { params });
  }
}
