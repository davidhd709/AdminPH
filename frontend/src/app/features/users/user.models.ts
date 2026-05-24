import { UserRole } from "../../core/auth/auth.models";

/**
 * Vista pública de un usuario (SafeUser del backend: sin password ni campos de
 * lockout). Se usa en selectores (ej. vincular usuario a propietario/residente).
 */
export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  document: string;
  phone: string | null;
  globalRole: UserRole;
  companyId: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
