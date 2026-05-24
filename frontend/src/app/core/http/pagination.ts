import { HttpParams } from "@angular/common/http";

/**
 * Contrato de paginación compartido con el backend (core/dto/pagination.dto.ts).
 * Lo consumen todos los servicios de listado de los módulos de negocio.
 */

export type SortOrder = "asc" | "desc";

/** Query params que acepta cualquier endpoint de listado. */
export interface PageQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface PageMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Respuesta estándar de un endpoint de listado paginado. */
export interface PaginatedResult<T> {
  items: T[];
  meta: PageMeta;
}

export const DEFAULT_PAGE_SIZE = 20;

/** Convierte un PageQuery en HttpParams, omitiendo los campos vacíos. */
export function toHttpParams(query: PageQuery): HttpParams {
  let params = new HttpParams()
    .set("page", query.page)
    .set("pageSize", query.pageSize);
  if (query.sortBy) params = params.set("sortBy", query.sortBy);
  if (query.sortOrder) params = params.set("sortOrder", query.sortOrder);
  return params;
}
