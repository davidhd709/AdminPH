export type DocumentType =
  | "REGULATION"
  | "MINUTES"
  | "CONTRACT"
  | "FINANCIAL_STATEMENT"
  | "BUDGET"
  | "POLICY"
  | "CERTIFICATE"
  | "COMMUNICATION"
  | "OTHER";

/**
 * Documento de la copropiedad. `fileUrl` es el enlace/path al archivo en el
 * storage; el upload binario real es deuda del backend (Fase 9), por lo que el
 * frontend gestiona metadatos + URL. Se nombra AppDocument para no chocar con
 * el `Document` global del DOM.
 */
export interface AppDocument {
  id: string;
  companyId: string;
  propertyId: string;
  uploadedById: string;
  type: DocumentType;
  title: string;
  description: string | null;
  fileUrl: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentPayload {
  propertyId: string;
  type: DocumentType;
  title: string;
  fileUrl: string;
  description?: string;
}

export interface NewVersionPayload {
  fileUrl: string;
  description?: string;
}

export const DOCUMENT_TYPE_OPTIONS: { label: string; value: DocumentType }[] = [
  { label: "Reglamento", value: "REGULATION" },
  { label: "Acta", value: "MINUTES" },
  { label: "Contrato", value: "CONTRACT" },
  { label: "Estado financiero", value: "FINANCIAL_STATEMENT" },
  { label: "Presupuesto", value: "BUDGET" },
  { label: "Póliza", value: "POLICY" },
  { label: "Certificado", value: "CERTIFICATE" },
  { label: "Comunicación", value: "COMMUNICATION" },
  { label: "Otro", value: "OTHER" },
];

const TYPE_LABELS = new Map(DOCUMENT_TYPE_OPTIONS.map((o) => [o.value, o.label]));

export function documentTypeLabel(type: DocumentType): string {
  return TYPE_LABELS.get(type) ?? type;
}
