import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { API } from "../../core/config/api.config";
import {
  CreateOwnerPayload,
  CreateResidentPayload,
  Owner,
  Resident,
} from "./people.models";

/**
 * Acceso a la API de personas (/api/v1/people). Owners y residents se listan
 * por unidad (no paginado) y se gestionan con alta/baja (sin edición).
 */
@Injectable({ providedIn: "root" })
export class PeopleService {
  private readonly http = inject(HttpClient);
  private readonly owners = `${API.baseUrl}${API.people.owners}`;
  private readonly residents = `${API.baseUrl}${API.people.residents}`;

  listOwners(unitId: string): Observable<Owner[]> {
    return this.http.get<Owner[]>(`${this.owners}/${unitId}`);
  }

  createOwner(payload: CreateOwnerPayload): Observable<Owner> {
    return this.http.post<Owner>(this.owners, payload);
  }

  removeOwner(id: string): Observable<Owner> {
    return this.http.delete<Owner>(`${this.owners}/${id}`);
  }

  listResidents(unitId: string): Observable<Resident[]> {
    return this.http.get<Resident[]>(`${this.residents}/${unitId}`);
  }

  createResident(payload: CreateResidentPayload): Observable<Resident> {
    return this.http.post<Resident>(this.residents, payload);
  }

  removeResident(id: string): Observable<Resident> {
    return this.http.delete<Resident>(`${this.residents}/${id}`);
  }
}
