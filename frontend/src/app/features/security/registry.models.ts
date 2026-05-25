export type VehicleType = "CAR" | "MOTORCYCLE" | "BICYCLE" | "OTHER";

export interface Vehicle {
  id: string;
  companyId: string;
  propertyId: string;
  unitId: string;
  plate: string;
  type: VehicleType;
  brand: string | null;
  color: string | null;
  parkingSpot: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pet {
  id: string;
  companyId: string;
  propertyId: string;
  unitId: string;
  name: string;
  species: string;
  breed: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehiclePayload {
  unitId: string;
  plate: string;
  type?: VehicleType;
  brand?: string;
  color?: string;
  parkingSpot?: string;
}

export interface CreatePetPayload {
  unitId: string;
  name: string;
  species: string;
  breed?: string;
  notes?: string;
}

export const VEHICLE_TYPE_OPTIONS: { label: string; value: VehicleType }[] = [
  { label: "Carro", value: "CAR" },
  { label: "Moto", value: "MOTORCYCLE" },
  { label: "Bicicleta", value: "BICYCLE" },
  { label: "Otro", value: "OTHER" },
];

const VEHICLE_TYPE_LABELS = new Map(VEHICLE_TYPE_OPTIONS.map((o) => [o.value, o.label]));

export function vehicleTypeLabel(type: VehicleType): string {
  return VEHICLE_TYPE_LABELS.get(type) ?? type;
}
