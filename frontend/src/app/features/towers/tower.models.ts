/** Entidad Tower (torre/bloque dentro de una copropiedad). */
export interface Tower {
  id: string;
  propertyId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload de creación (POST /towers). Requiere propertyId. */
export interface CreateTowerPayload {
  propertyId: string;
  name: string;
  description?: string;
}

/**
 * Payload de actualización (PATCH /towers/:id). No incluye propertyId:
 * una torre no se mueve de copropiedad.
 */
export type UpdateTowerPayload = Partial<Omit<CreateTowerPayload, "propertyId">>;
