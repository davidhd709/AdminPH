export type PaymentStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "PARTIAL";

interface PaymentUnitRef {
  id: string;
  code: string;
}
interface PaymentUserRef {
  id: string;
  fullName: string;
}

/** Pago (Payment) registrado contra una unidad. Montos Decimal → string. */
export interface Payment {
  id: string;
  companyId: string;
  propertyId: string;
  unitId: string;
  userId: string;
  amount: string;
  receiptUrl: string;
  bankReference: string;
  status: PaymentStatus;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  unit?: PaymentUnitRef;
  user?: PaymentUserRef;
}

export interface CreatePaymentPayload {
  unitId: string;
  amount: number;
  bankReference: string;
  receiptUrl: string;
}

export interface PaymentAllocation {
  feeId: string;
  amount: number;
}

/** Respuesta de aprobar un pago: el pago actualizado + sus asignaciones. */
export interface ApprovePaymentResult {
  payment: Payment;
  allocations: PaymentAllocation[];
}
