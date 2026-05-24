import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { API } from "../../core/config/api.config";
import { PageQuery, PaginatedResult, toHttpParams } from "../../core/http/pagination";
import { Fee } from "./fee.models";

export interface FeeListQuery extends PageQuery {
  unitId?: string;
  status?: string;
  period?: string;
}

/** Acceso de lectura a las cuotas (/api/v1/finance/fees). */
@Injectable({ providedIn: "root" })
export class FeeService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API.baseUrl}${API.finance.fees}`;

  list(query: FeeListQuery): Observable<PaginatedResult<Fee>> {
    let params = toHttpParams(query);
    if (query.unitId) params = params.set("unitId", query.unitId);
    if (query.status) params = params.set("status", query.status);
    if (query.period) params = params.set("period", query.period);
    return this.http.get<PaginatedResult<Fee>>(this.base, { params });
  }
}
