import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { API } from "../../core/config/api.config";
import { PageQuery, PaginatedResult, toHttpParams } from "../../core/http/pagination";
import {
  CreatePetPayload,
  CreateVehiclePayload,
  Pet,
  Vehicle,
} from "./registry.models";

export interface RegistryListQuery extends PageQuery {
  propertyId?: string;
  unitId?: string;
}

/** Acceso a la API de registro (/api/v1/registry): vehículos y mascotas por unidad. */
@Injectable({ providedIn: "root" })
export class RegistryService {
  private readonly http = inject(HttpClient);
  private readonly petsUrl = `${API.baseUrl}${API.registry.pets}`;
  private readonly vehiclesUrl = `${API.baseUrl}${API.registry.vehicles}`;

  private params(query: RegistryListQuery) {
    let params = toHttpParams(query);
    if (query.propertyId) params = params.set("propertyId", query.propertyId);
    if (query.unitId) params = params.set("unitId", query.unitId);
    return params;
  }

  listVehicles(query: RegistryListQuery): Observable<PaginatedResult<Vehicle>> {
    return this.http.get<PaginatedResult<Vehicle>>(this.vehiclesUrl, { params: this.params(query) });
  }

  createVehicle(payload: CreateVehiclePayload): Observable<Vehicle> {
    return this.http.post<Vehicle>(this.vehiclesUrl, payload);
  }

  removeVehicle(id: string): Observable<Vehicle> {
    return this.http.delete<Vehicle>(`${this.vehiclesUrl}/${id}`);
  }

  listPets(query: RegistryListQuery): Observable<PaginatedResult<Pet>> {
    return this.http.get<PaginatedResult<Pet>>(this.petsUrl, { params: this.params(query) });
  }

  createPet(payload: CreatePetPayload): Observable<Pet> {
    return this.http.post<Pet>(this.petsUrl, payload);
  }

  removePet(id: string): Observable<Pet> {
    return this.http.delete<Pet>(`${this.petsUrl}/${id}`);
  }
}
