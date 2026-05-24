import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { API } from "../../core/config/api.config";
import {
  CreateFeeConceptPayload,
  FeeConcept,
  UpdateFeeConceptPayload,
} from "./concept.models";

/**
 * Acceso a la API de conceptos de cobro (/api/v1/finance/fee-concepts).
 * El listado va acotado a una copropiedad (propertyId obligatorio) y no es
 * paginado (los conceptos por copropiedad son pocos).
 */
@Injectable({ providedIn: "root" })
export class ConceptService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API.baseUrl}${API.finance.concepts}`;

  list(propertyId: string): Observable<FeeConcept[]> {
    const params = new HttpParams().set("propertyId", propertyId);
    return this.http.get<FeeConcept[]>(this.base, { params });
  }

  create(payload: CreateFeeConceptPayload): Observable<FeeConcept> {
    return this.http.post<FeeConcept>(this.base, payload);
  }

  update(id: string, payload: UpdateFeeConceptPayload): Observable<FeeConcept> {
    return this.http.patch<FeeConcept>(`${this.base}/${id}`, payload);
  }

  remove(id: string): Observable<FeeConcept> {
    return this.http.delete<FeeConcept>(`${this.base}/${id}`);
  }
}
