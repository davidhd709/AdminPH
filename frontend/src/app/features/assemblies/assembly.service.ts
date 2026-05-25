import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { API } from "../../core/config/api.config";
import { PageQuery, PaginatedResult, toHttpParams } from "../../core/http/pagination";
import {
  Assembly,
  AssemblyAttendance,
  AssemblyDetail,
  AssemblyStatus,
  AssemblyType,
  CastVotePayload,
  CreateAssemblyPayload,
  CreateVotingPayload,
  RegisterAttendancePayload,
  Voting,
  VotingTally,
} from "./assembly.models";

export interface AssemblyListQuery extends PageQuery {
  propertyId?: string;
  status?: AssemblyStatus;
  type?: AssemblyType;
}

/**
 * Acceso a la API de asambleas (/api/v1/assemblies): asambleas, asistencia,
 * votaciones y votos. El conteo (tally) lo calcula el backend.
 */
@Injectable({ providedIn: "root" })
export class AssemblyService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API.baseUrl}${API.assemblies}`;

  list(query: AssemblyListQuery): Observable<PaginatedResult<Assembly>> {
    let params = toHttpParams(query);
    if (query.propertyId) params = params.set("propertyId", query.propertyId);
    if (query.status) params = params.set("status", query.status);
    if (query.type) params = params.set("type", query.type);
    return this.http.get<PaginatedResult<Assembly>>(this.base, { params });
  }

  getById(id: string): Observable<AssemblyDetail> {
    return this.http.get<AssemblyDetail>(`${this.base}/${id}`);
  }

  create(payload: CreateAssemblyPayload): Observable<Assembly> {
    return this.http.post<Assembly>(this.base, payload);
  }

  updateStatus(id: string, status: AssemblyStatus): Observable<Assembly> {
    return this.http.patch<Assembly>(`${this.base}/${id}/status`, { status });
  }

  registerAttendance(
    id: string,
    payload: RegisterAttendancePayload,
  ): Observable<AssemblyAttendance> {
    return this.http.post<AssemblyAttendance>(`${this.base}/${id}/attendance`, payload);
  }

  createVoting(id: string, payload: CreateVotingPayload): Observable<Voting> {
    return this.http.post<Voting>(`${this.base}/${id}/votings`, payload);
  }

  castVote(votingId: string, payload: CastVotePayload): Observable<unknown> {
    return this.http.post(`${this.base}/votings/${votingId}/votes`, payload);
  }

  closeVoting(votingId: string): Observable<Voting> {
    return this.http.patch<Voting>(`${this.base}/votings/${votingId}/close`, {});
  }

  tally(votingId: string): Observable<VotingTally> {
    return this.http.get<VotingTally>(`${this.base}/votings/${votingId}/results`);
  }
}
