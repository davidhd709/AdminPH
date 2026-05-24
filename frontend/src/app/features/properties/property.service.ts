import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { API } from "../../core/config/api.config";
import { PageQuery, PaginatedResult, toHttpParams } from "../../core/http/pagination";
import { CreatePropertyPayload, Property, UpdatePropertyPayload } from "./property.models";

/**
 * Acceso a la API de copropiedades (/api/v1/properties).
 * El Bearer token y el manejo de errores los aportan los interceptors.
 */
@Injectable({ providedIn: "root" })
export class PropertyService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API.baseUrl}${API.properties}`;

  list(query: PageQuery): Observable<PaginatedResult<Property>> {
    return this.http.get<PaginatedResult<Property>>(this.base, { params: toHttpParams(query) });
  }

  getById(id: string): Observable<Property> {
    return this.http.get<Property>(`${this.base}/${id}`);
  }

  create(payload: CreatePropertyPayload): Observable<Property> {
    return this.http.post<Property>(this.base, payload);
  }

  update(id: string, payload: UpdatePropertyPayload): Observable<Property> {
    return this.http.patch<Property>(`${this.base}/${id}`, payload);
  }

  remove(id: string): Observable<Property> {
    return this.http.delete<Property>(`${this.base}/${id}`);
  }
}
