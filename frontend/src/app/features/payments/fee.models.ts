export type FeeStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";

/** Refs incluidas por el backend en el listado (include unit + concept). */
interface FeeUnitRef {
  id: string;
  code: string;
}
interface FeeConceptRef {
  id: string;
  name: string;
}

/**
 * Cuota (Fee) de una unidad. Montos Decimal del backend → string en JSON.
 * Solo lectura desde el frontend (se generan/anulan en el backend).
 */
export interface Fee {
  id: string;
  companyId: string;
  propertyId: string;
  unitId: string;
  conceptId: string;
  amount: string;
  pendingAmount: string;
  paidAmount: string;
  dueDate: string;
  status: FeeStatus;
  period: string;
  createdAt: string;
  updatedAt: string;
  unit?: FeeUnitRef;
  concept?: FeeConceptRef;
}
