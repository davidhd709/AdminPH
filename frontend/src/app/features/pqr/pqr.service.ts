import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { API } from "../../core/config/api.config";
import { PageQuery, PaginatedResult, toHttpParams } from "../../core/http/pagination";
import {
  CreatePqrPayload,
  Pqr,
  PqrCategory,
  PqrDetail,
  PqrResponse,
  PqrStatus,
} from "./pqr.models";

export interface PqrListQuery extends PageQuery {
  propertyId?: string;
  status?: PqrStatus;
  category?: PqrCategory;
}

/**
 * Acceso a la API de PQR (/api/v1/pqr). Listar (scoped por rol en el backend),
 * ver detalle con respuestas, crear, responder y cambiar estado (staff).
 */
@Injectable({ providedIn: "root" })
export class PqrService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API.baseUrl}${API.pqr}`;

  list(query: PqrListQuery): Observable<PaginatedResult<Pqr>> {
    let params = toHttpParams(query);
    if (query.propertyId) params = params.set("propertyId", query.propertyId);
    if (query.status) params = params.set("status", query.status);
    if (query.category) params = params.set("category", query.category);
    return this.http.get<PaginatedResult<Pqr>>(this.base, { params });
  }

  getById(id: string): Observable<PqrDetail> {
    return this.http.get<PqrDetail>(`${this.base}/${id}`);
  }

  create(payload: CreatePqrPayload): Observable<Pqr> {
    return this.http.post<Pqr>(this.base, payload);
  }

  updateStatus(id: string, status: PqrStatus): Observable<Pqr> {
    return this.http.patch<Pqr>(`${this.base}/${id}/status`, { status });
  }

  respond(id: string, message: string): Observable<PqrResponse> {
    return this.http.post<PqrResponse>(`${this.base}/${id}/responses`, { message });
  }
}
