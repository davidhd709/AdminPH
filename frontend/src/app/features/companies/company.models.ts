export type CompanyStatus = "ACTIVE" | "SUSPENDED" | "CANCELLED";

/** Entidad Company tal como la devuelve el backend (fechas como ISO string). */
export interface Company {
  id: string;
  name: string;
  nit: string | null;
  status: CompanyStatus;
  createdAt: string;
  updatedAt: string;
}

/** Payload de creación (POST /companies). */
export interface CreateCompanyPayload {
  name: string;
  nit?: string;
}

/** Payload de actualización parcial (PATCH /companies/:id). */
export interface UpdateCompanyPayload {
  name?: string;
  nit?: string;
}
