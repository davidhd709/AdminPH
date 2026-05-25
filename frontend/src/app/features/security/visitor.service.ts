import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { API } from "../../core/config/api.config";
import { PageQuery, PaginatedResult, toHttpParams } from "../../core/http/pagination";
import { CreateVisitorPayload, Visitor, VisitorType } from "./visitor.models";

export interface VisitorListQuery extends PageQuery {
  propertyId?: string;
  type?: VisitorType;
}

/** Acceso a la API de visitantes (/api/v1/visitors): bitácora de ingreso/salida. */
@Injectable({ providedIn: "root" })
export class VisitorService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API.baseUrl}${API.visitors}`;

  list(query: VisitorListQuery): Observable<PaginatedResult<Visitor>> {
    let params = toHttpParams(query);
    if (query.propertyId) params = params.set("propertyId", query.propertyId);
    if (query.type) params = params.set("type", query.type);
    return this.http.get<PaginatedResult<Visitor>>(this.base, { params });
  }

  register(payload: CreateVisitorPayload): Observable<Visitor> {
    return this.http.post<Visitor>(this.base, payload);
  }

  registerExit(id: string): Observable<Visitor> {
    return this.http.patch<Visitor>(`${this.base}/${id}/exit`, {});
  }
}
