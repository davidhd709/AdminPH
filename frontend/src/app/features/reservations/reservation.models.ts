export type ReservationStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type ReviewStatus = "APPROVED" | "REJECTED";

/** Zona común reservable (salón social, piscina, BBQ, etc.). */
export interface CommonArea {
  id: string;
  companyId: string;
  propertyId: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Reserva de una zona común. Fechas como ISO string. */
export interface Reservation {
  id: string;
  companyId: string;
  propertyId: string;
  commonAreaId: string;
  unitId: string | null;
  requestedById: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  notes: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommonAreaPayload {
  propertyId: string;
  name: string;
  description?: string;
}

export interface CreateReservationPayload {
  commonAreaId: string;
  startTime: string;
  endTime: string;
  unitId?: string;
  notes?: string;
}

export const RESERVATION_STATUS_OPTIONS: { label: string; value: ReservationStatus }[] = [
  { label: "Pendiente", value: "PENDING" },
  { label: "Aprobada", value: "APPROVED" },
  { label: "Rechazada", value: "REJECTED" },
  { label: "Cancelada", value: "CANCELLED" },
];
