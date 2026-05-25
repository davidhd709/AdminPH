export type UnitStatus = "OCCUPIED" | "VACANT" | "RENTED" | "MAINTENANCE";

/**
 * Entidad Unit (unidad/apartamento). `area` y `coefficient` son Decimal de
 * Prisma → llegan como string en JSON. `status` no se edita por esta API
 * (default VACANT en el backend); se muestra como solo lectura.
 */
export interface Unit {
  id: string;
  propertyId: string;
  towerId: string | null;
  code: string;
  floor: number;
  number: string;
  area: string;
  coefficient: string;
  status: UnitStatus;
  createdAt: string;
  updatedAt: string;
}

/** Unidad del usuario actual (GET /units/mine), con refs de copropiedad y torre. */
export interface MyUnit extends Unit {
  property: { id: string; name: string };
  tower: { id: string; name: string } | null;
}

/** Payload de creación (POST /units). Requiere propertyId. */
export interface CreateUnitPayload {
  propertyId: string;
  towerId?: string;
  code: string;
  floor: number;
  number: string;
  area: number;
  coefficient: number;
}

/**
 * Payload de actualización (PATCH /units/:id). No incluye propertyId
 * (una unidad no se mueve de copropiedad), pero sí towerId.
 */
export type UpdateUnitPayload = Partial<Omit<CreateUnitPayload, "propertyId">>;
