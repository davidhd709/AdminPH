import { SetMetadata } from "@nestjs/common";

export interface Role {
  SUPERADMIN: string;
  COMPANY_ADMIN: string;
  PROPERTY_ADMIN: string;
  ACCOUNTANT: string;
  SECURITY: string;
  OWNER: string;
  RESIDENT: string;
}

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
