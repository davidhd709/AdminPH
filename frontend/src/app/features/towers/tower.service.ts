import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { API } from "../../core/config/api.config";
import { PageQuery, PaginatedResult, toHttpParams } from "../../core/http/pagination";
import { CreateTowerPayload, Tower, UpdateTowerPayload } from "./tower.models";

/**
 * Acceso a la API de torres (/api/v1/towers).
 * El listado siempre va acotado a una copropiedad (propertyId obligatorio).
 */
@Injectable({ providedIn: "root" })
export class TowerService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API.baseUrl}${API.towers}`;

  list(propertyId: string, query: PageQuery): Observable<PaginatedResult<Tower>> {
    const params = toHttpParams(query).set("propertyId", propertyId);
    return this.http.get<PaginatedResult<Tower>>(this.base, { params });
  }

  getById(id: string): Observable<Tower> {
    return this.http.get<Tower>(`${this.base}/${id}`);
  }

  create(payload: CreateTowerPayload): Observable<Tower> {
    return this.http.post<Tower>(this.base, payload);
  }

  update(id: string, payload: UpdateTowerPayload): Observable<Tower> {
    return this.http.patch<Tower>(`${this.base}/${id}`, payload);
  }

  remove(id: string): Observable<Tower> {
    return this.http.delete<Tower>(`${this.base}/${id}`);
  }
}
