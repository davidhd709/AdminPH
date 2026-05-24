export type FeeConceptType =
  | "ADMINISTRATION"
  | "EXTRAORDINARY"
  | "FINE"
  | "INTEREST"
  | "PARKING"
  | "OTHER";

export type CalculationType = "FIXED" | "COEFFICIENT";

/**
 * Concepto de cobro de una copropiedad. `defaultAmount` es Decimal del backend
 * → llega como string en JSON.
 */
export interface FeeConcept {
  id: string;
  companyId: string;
  propertyId: string;
  name: string;
  description: string | null;
  type: FeeConceptType;
  calculationType: CalculationType;
  defaultAmount: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Payload de creación (POST /finance/fee-concepts). Requiere propertyId. */
export interface CreateFeeConceptPayload {
  propertyId: string;
  name: string;
  description?: string;
  type: FeeConceptType;
  calculationType: CalculationType;
  defaultAmount: number;
  active?: boolean;
}

/** Payload de actualización (PATCH). No incluye propertyId. */
export type UpdateFeeConceptPayload = Partial<Omit<CreateFeeConceptPayload, "propertyId">>;

export const FEE_CONCEPT_TYPE_OPTIONS: { label: string; value: FeeConceptType }[] = [
  { label: "Administración", value: "ADMINISTRATION" },
  { label: "Extraordinaria", value: "EXTRAORDINARY" },
  { label: "Multa", value: "FINE" },
  { label: "Interés", value: "INTEREST" },
  { label: "Parqueadero", value: "PARKING" },
  { label: "Otro", value: "OTHER" },
];

export const CALCULATION_TYPE_OPTIONS: { label: string; value: CalculationType }[] = [
  { label: "Monto fijo", value: "FIXED" },
  { label: "Por coeficiente", value: "COEFFICIENT" },
];

const TYPE_LABELS = new Map(FEE_CONCEPT_TYPE_OPTIONS.map((o) => [o.value, o.label]));
const CALC_LABELS = new Map(CALCULATION_TYPE_OPTIONS.map((o) => [o.value, o.label]));

export function feeConceptTypeLabel(type: FeeConceptType): string {
  return TYPE_LABELS.get(type) ?? type;
}

export function calculationTypeLabel(type: CalculationType): string {
  return CALC_LABELS.get(type) ?? type;
}
