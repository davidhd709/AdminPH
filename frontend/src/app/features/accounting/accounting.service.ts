import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { API } from "../../core/config/api.config";
import { PageQuery, PaginatedResult, toHttpParams } from "../../core/http/pagination";
import {
  AccountingCategory,
  BankAccount,
  CreateBankAccountPayload,
  CreateCategoryPayload,
  CreateTransactionPayload,
  Transaction,
  TransactionType,
} from "./accounting.models";

export interface TransactionListQuery extends PageQuery {
  propertyId?: string;
  type?: TransactionType;
  categoryId?: string;
}

/**
 * Acceso a la API de contabilidad (/api/v1/accounting): cuentas bancarias y
 * categorías (crear/listar) y movimientos (crear/listar/eliminar). Todo scoped
 * por copropiedad. Solo roles financieros.
 */
@Injectable({ providedIn: "root" })
export class AccountingService {
  private readonly http = inject(HttpClient);
  private readonly bankAccountsUrl = `${API.baseUrl}${API.accounting.bankAccounts}`;
  private readonly categoriesUrl = `${API.baseUrl}${API.accounting.categories}`;
  private readonly transactionsUrl = `${API.baseUrl}${API.accounting.transactions}`;

  // ===== Bank accounts =====
  listBankAccounts(propertyId: string, query: PageQuery): Observable<PaginatedResult<BankAccount>> {
    const params = toHttpParams(query).set("propertyId", propertyId);
    return this.http.get<PaginatedResult<BankAccount>>(this.bankAccountsUrl, { params });
  }

  createBankAccount(payload: CreateBankAccountPayload): Observable<BankAccount> {
    return this.http.post<BankAccount>(this.bankAccountsUrl, payload);
  }

  // ===== Categories =====
  listCategories(
    propertyId: string,
    query: PageQuery,
  ): Observable<PaginatedResult<AccountingCategory>> {
    const params = toHttpParams(query).set("propertyId", propertyId);
    return this.http.get<PaginatedResult<AccountingCategory>>(this.categoriesUrl, { params });
  }

  createCategory(payload: CreateCategoryPayload): Observable<AccountingCategory> {
    return this.http.post<AccountingCategory>(this.categoriesUrl, payload);
  }

  // ===== Transactions =====
  listTransactions(query: TransactionListQuery): Observable<PaginatedResult<Transaction>> {
    let params = toHttpParams(query);
    if (query.propertyId) params = params.set("propertyId", query.propertyId);
    if (query.type) params = params.set("type", query.type);
    if (query.categoryId) params = params.set("categoryId", query.categoryId);
    return this.http.get<PaginatedResult<Transaction>>(this.transactionsUrl, { params });
  }

  createTransaction(payload: CreateTransactionPayload): Observable<Transaction> {
    return this.http.post<Transaction>(this.transactionsUrl, payload);
  }

  removeTransaction(id: string): Observable<Transaction> {
    return this.http.delete<Transaction>(`${this.transactionsUrl}/${id}`);
  }
}
