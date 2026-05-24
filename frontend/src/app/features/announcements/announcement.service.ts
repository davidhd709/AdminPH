import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { API } from "../../core/config/api.config";
import { PageQuery, PaginatedResult, toHttpParams } from "../../core/http/pagination";
import { Announcement, CreateAnnouncementPayload } from "./announcement.models";

export interface AnnouncementListQuery extends PageQuery {
  propertyId?: string;
}

/**
 * Acceso a la API de comunicados (/api/v1/announcements). Listar (scoped por
 * rol en el backend), crear (staff) y marcar como leído.
 */
@Injectable({ providedIn: "root" })
export class AnnouncementService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API.baseUrl}${API.announcements}`;

  list(query: AnnouncementListQuery): Observable<PaginatedResult<Announcement>> {
    let params = toHttpParams(query);
    if (query.propertyId) params = params.set("propertyId", query.propertyId);
    return this.http.get<PaginatedResult<Announcement>>(this.base, { params });
  }

  create(payload: CreateAnnouncementPayload): Observable<Announcement> {
    return this.http.post<Announcement>(this.base, payload);
  }

  markAsRead(id: string): Observable<{ readAt: string }> {
    return this.http.post<{ readAt: string }>(`${this.base}/${id}/read`, {});
  }
}
