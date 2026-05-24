export type PqrCategory = "PETITION" | "COMPLAINT" | "CLAIM" | "SUGGESTION" | "OTHER";
export type PqrStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "REJECTED";

/** PQR (petición, queja, reclamo, sugerencia). */
export interface Pqr {
  id: string;
  ticketNumber: number;
  companyId: string;
  propertyId: string;
  unitId: string | null;
  createdById: string;
  category: PqrCategory;
  subject: string;
  description: string;
  status: PqrStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PqrResponse {
  id: string;
  pqrId: string;
  authorId: string;
  message: string;
  createdAt: string;
}

/** Detalle (GET /pqr/:id): incluye respuestas ordenadas y el radicado legible. */
export interface PqrDetail extends Pqr {
  responses: PqrResponse[];
  radicado: string;
}

export interface CreatePqrPayload {
  propertyId: string;
  category: PqrCategory;
  subject: string;
  description: string;
  unitId?: string;
}

export const PQR_CATEGORY_OPTIONS: { label: string; value: PqrCategory }[] = [
  { label: "Petición", value: "PETITION" },
  { label: "Queja", value: "COMPLAINT" },
  { label: "Reclamo", value: "CLAIM" },
  { label: "Sugerencia", value: "SUGGESTION" },
  { label: "Otro", value: "OTHER" },
];

export const PQR_STATUS_OPTIONS: { label: string; value: PqrStatus }[] = [
  { label: "Abierta", value: "OPEN" },
  { label: "En progreso", value: "IN_PROGRESS" },
  { label: "Resuelta", value: "RESOLVED" },
  { label: "Cerrada", value: "CLOSED" },
  { label: "Rechazada", value: "REJECTED" },
];

const CATEGORY_LABELS = new Map(PQR_CATEGORY_OPTIONS.map((o) => [o.value, o.label]));

export function pqrCategoryLabel(category: PqrCategory): string {
  return CATEGORY_LABELS.get(category) ?? category;
}

/** Radicado legible derivado del ticketNumber (espejo del backend). */
export function buildRadicado(pqr: { ticketNumber: number; createdAt: string }): string {
  const year = new Date(pqr.createdAt).getUTCFullYear();
  return `PQR-${year}-${String(pqr.ticketNumber).padStart(6, "0")}`;
}
