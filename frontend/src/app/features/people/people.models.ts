import { UserRole } from "../../core/auth/auth.models";

/** Datos públicos del usuario vinculado a un propietario/residente. */
export interface LinkedUser {
  id: string;
  fullName: string;
  email: string;
  document: string;
  phone: string | null;
  globalRole: UserRole;
}

export interface Owner {
  id: string;
  userId: string | null;
  unitId: string;
  isPrimary: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: LinkedUser | null;
}

export interface Resident {
  id: string;
  userId: string | null;
  unitId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: LinkedUser | null;
}

export interface CreateOwnerPayload {
  unitId: string;
  userId?: string;
  status?: string;
}

export interface CreateResidentPayload {
  unitId: string;
  userId?: string;
  status?: string;
}
