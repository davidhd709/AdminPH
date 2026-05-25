export type VisitorType = "VISITOR" | "DELIVERY" | "PROVIDER" | "TECHNICIAN" | "OTHER";

/** Registro de ingreso/salida de un visitante. */
export interface Visitor {
  id: string;
  companyId: string;
  propertyId: string;
  unitId: string | null;
  registeredById: string;
  fullName: string;
  document: string | null;
  type: VisitorType;
  entryAt: string;
  exitAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVisitorPayload {
  propertyId: string;
  fullName: string;
  unitId?: string;
  document?: string;
  type?: VisitorType;
  notes?: string;
}

export const VISITOR_TYPE_OPTIONS: { label: string; value: VisitorType }[] = [
  { label: "Visitante", value: "VISITOR" },
  { label: "Domicilio", value: "DELIVERY" },
  { label: "Proveedor", value: "PROVIDER" },
  { label: "Técnico", value: "TECHNICIAN" },
  { label: "Otro", value: "OTHER" },
];

const TYPE_LABELS = new Map(VISITOR_TYPE_OPTIONS.map((o) => [o.value, o.label]));

export function visitorTypeLabel(type: VisitorType): string {
  return TYPE_LABELS.get(type) ?? type;
}
