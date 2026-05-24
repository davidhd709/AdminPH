import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { API } from "../../core/config/api.config";
import { PageQuery, PaginatedResult, toHttpParams } from "../../core/http/pagination";
import {
  CommonArea,
  CreateCommonAreaPayload,
  CreateReservationPayload,
  Reservation,
  ReservationStatus,
  ReviewStatus,
} from "./reservation.models";

export interface ReservationListQuery extends PageQuery {
  propertyId?: string;
  commonAreaId?: string;
  status?: ReservationStatus;
}

/**
 * Acceso a la API de reservas (/api/v1/reservations). Zonas comunes
 * (crear/listar) y reservas (crear/listar/revisar/cancelar). El backend valida
 * solapamientos y el scoping por rol.
 */
@Injectable({ providedIn: "root" })
export class ReservationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API.baseUrl}${API.reservations.base}`;
  private readonly areasUrl = `${API.baseUrl}${API.reservations.areas}`;

  listAreas(propertyId: string, query: PageQuery): Observable<PaginatedResult<CommonArea>> {
    const params = toHttpParams(query).set("propertyId", propertyId);
    return this.http.get<PaginatedResult<CommonArea>>(this.areasUrl, { params });
  }

  createArea(payload: CreateCommonAreaPayload): Observable<CommonArea> {
    return this.http.post<CommonArea>(this.areasUrl, payload);
  }

  listReservations(query: ReservationListQuery): Observable<PaginatedResult<Reservation>> {
    let params = toHttpParams(query);
    if (query.propertyId) params = params.set("propertyId", query.propertyId);
    if (query.commonAreaId) params = params.set("commonAreaId", query.commonAreaId);
    if (query.status) params = params.set("status", query.status);
    return this.http.get<PaginatedResult<Reservation>>(this.base, { params });
  }

  createReservation(payload: CreateReservationPayload): Observable<Reservation> {
    return this.http.post<Reservation>(this.base, payload);
  }

  review(id: string, status: ReviewStatus): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.base}/${id}/review`, { status });
  }

  cancel(id: string): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.base}/${id}/cancel`, {});
  }
}
