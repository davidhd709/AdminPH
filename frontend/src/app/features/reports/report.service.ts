import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { API } from "../../core/config/api.config";

/**
 * Descarga de reportes (/api/v1/reports) como Blob. Los endpoints devuelven
 * archivos binarios (PDF/Excel) y van autenticados con Bearer (lo agrega el
 * authInterceptor), por eso no se pueden abrir con un <a href> plano.
 */
@Injectable({ providedIn: "root" })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API.baseUrl}${API.reports}`;

  /** Estado de cuenta de una unidad (PDF). */
  accountStatement(unitId: string): Observable<Blob> {
    return this.http.get(`${this.base}/account-statement/${unitId}.pdf`, { responseType: "blob" });
  }

  /** Paz y salvo de una unidad (PDF). */
  pazYSalvo(unitId: string): Observable<Blob> {
    return this.http.get(`${this.base}/paz-y-salvo/${unitId}.pdf`, { responseType: "blob" });
  }

  /** Cartera de una copropiedad (Excel). */
  portfolio(propertyId: string): Observable<Blob> {
    return this.http.get(`${this.base}/portfolio/${propertyId}.xlsx`, { responseType: "blob" });
  }
}
