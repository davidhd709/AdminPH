import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { API } from "../../core/config/api.config";
import { PageQuery, PaginatedResult, toHttpParams } from "../../core/http/pagination";
import {
  AppDocument,
  CreateDocumentPayload,
  DocumentType,
  NewVersionPayload,
} from "./document.models";

export interface DocumentListQuery extends PageQuery {
  propertyId?: string;
  type?: DocumentType;
}

/** Acceso a la API de documentos (/api/v1/documents). Metadatos + fileUrl. */
@Injectable({ providedIn: "root" })
export class DocumentService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API.baseUrl}${API.documents}`;

  list(query: DocumentListQuery): Observable<PaginatedResult<AppDocument>> {
    let params = toHttpParams(query);
    if (query.propertyId) params = params.set("propertyId", query.propertyId);
    if (query.type) params = params.set("type", query.type);
    return this.http.get<PaginatedResult<AppDocument>>(this.base, { params });
  }

  create(payload: CreateDocumentPayload): Observable<AppDocument> {
    return this.http.post<AppDocument>(this.base, payload);
  }

  newVersion(id: string, payload: NewVersionPayload): Observable<AppDocument> {
    return this.http.post<AppDocument>(`${this.base}/${id}/versions`, payload);
  }

  remove(id: string): Observable<AppDocument> {
    return this.http.delete<AppDocument>(`${this.base}/${id}`);
  }
}
