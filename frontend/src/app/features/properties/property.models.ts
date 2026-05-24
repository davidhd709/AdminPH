export type PropertyStatus = "ACTIVE" | "INACTIVE";

/**
 * Entidad Property (copropiedad) tal como la devuelve el backend.
 * `coefficientTotal` es un Decimal de Prisma → llega como string en JSON.
 * Fechas como ISO string.
 */
export interface Property {
  id: string;
  companyId: string;
  name: string;
  nit: string | null;
  address: string;
  city: string;
  department: string;
  phone: string | null;
  email: string | null;
  coefficientTotal: string;
  status: PropertyStatus;
  createdAt: string;
  updatedAt: string;
}

/** Payload de creación (POST /properties). Requiere companyId. */
export interface CreatePropertyPayload {
  companyId: string;
  name: string;
  nit?: string;
  address: string;
  city: string;
  department: string;
  phone?: string;
  email?: string;
  coefficientTotal: number;
}

/**
 * Payload de actualización (PATCH /properties/:id). No incluye companyId:
 * una copropiedad no se mueve de empresa.
 */
export type UpdatePropertyPayload = Partial<Omit<CreatePropertyPayload, "companyId">>;
