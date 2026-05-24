import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { API } from "../../core/config/api.config";
import { PageQuery, PaginatedResult, toHttpParams } from "../../core/http/pagination";
import { Company, CreateCompanyPayload, UpdateCompanyPayload } from "./company.models";

/**
 * Acceso a la API de empresas (/api/v1/companies).
 * El Bearer token y el manejo de errores los aportan los interceptors.
 */
@Injectable({ providedIn: "root" })
export class CompanyService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API.baseUrl}${API.companies}`;

  list(query: PageQuery): Observable<PaginatedResult<Company>> {
    return this.http.get<PaginatedResult<Company>>(this.base, { params: toHttpParams(query) });
  }

  getById(id: string): Observable<Company> {
    return this.http.get<Company>(`${this.base}/${id}`);
  }

  create(payload: CreateCompanyPayload): Observable<Company> {
    return this.http.post<Company>(this.base, payload);
  }

  update(id: string, payload: UpdateCompanyPayload): Observable<Company> {
    return this.http.patch<Company>(`${this.base}/${id}`, payload);
  }

  remove(id: string): Observable<Company> {
    return this.http.delete<Company>(`${this.base}/${id}`);
  }
}
