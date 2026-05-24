import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { API } from "../../core/config/api.config";
import { PageQuery, PaginatedResult, toHttpParams } from "../../core/http/pagination";
import { CreateUnitPayload, Unit, UpdateUnitPayload } from "./unit.models";

/**
 * Acceso a la API de unidades (/api/v1/units).
 * El listado siempre va acotado a una copropiedad (propertyId obligatorio).
 */
@Injectable({ providedIn: "root" })
export class UnitService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API.baseUrl}${API.units}`;

  list(propertyId: string, query: PageQuery): Observable<PaginatedResult<Unit>> {
    const params = toHttpParams(query).set("propertyId", propertyId);
    return this.http.get<PaginatedResult<Unit>>(this.base, { params });
  }

  getById(id: string): Observable<Unit> {
    return this.http.get<Unit>(`${this.base}/${id}`);
  }

  create(payload: CreateUnitPayload): Observable<Unit> {
    return this.http.post<Unit>(this.base, payload);
  }

  update(id: string, payload: UpdateUnitPayload): Observable<Unit> {
    return this.http.patch<Unit>(`${this.base}/${id}`, payload);
  }

  remove(id: string): Observable<Unit> {
    return this.http.delete<Unit>(`${this.base}/${id}`);
  }
}
