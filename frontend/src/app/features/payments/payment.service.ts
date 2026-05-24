import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { API } from "../../core/config/api.config";
import { PageQuery, PaginatedResult, toHttpParams } from "../../core/http/pagination";
import { ApprovePaymentResult, CreatePaymentPayload, Payment } from "./payment.models";

export interface PaymentListQuery extends PageQuery {
  unitId?: string;
  status?: string;
}

/**
 * Acceso a la API de pagos (/api/v1/payments). Registrar pago, listar (con
 * filtros), aprobar (asigna a cuotas oldest-first) y rechazar.
 */
@Injectable({ providedIn: "root" })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API.baseUrl}${API.payments}`;

  list(query: PaymentListQuery): Observable<PaginatedResult<Payment>> {
    let params = toHttpParams(query);
    if (query.unitId) params = params.set("unitId", query.unitId);
    if (query.status) params = params.set("status", query.status);
    return this.http.get<PaginatedResult<Payment>>(this.base, { params });
  }

  create(payload: CreatePaymentPayload): Observable<Payment> {
    return this.http.post<Payment>(this.base, payload);
  }

  approve(paymentId: string): Observable<ApprovePaymentResult> {
    return this.http.patch<ApprovePaymentResult>(`${this.base}/approve`, { paymentId });
  }

  reject(paymentId: string, rejectionReason: string): Observable<Payment> {
    return this.http.patch<Payment>(`${this.base}/reject`, { paymentId, rejectionReason });
  }
}
