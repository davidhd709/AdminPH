export type UserRole =
  | "SUPERADMIN"
  | "COMPANY_ADMIN"
  | "PROPERTY_ADMIN"
  | "ACCOUNTANT"
  | "SECURITY"
  | "OWNER"
  | "RESIDENT";

export const ALL_ROLES: UserRole[] = [
  "SUPERADMIN",
  "COMPANY_ADMIN",
  "PROPERTY_ADMIN",
  "ACCOUNTANT",
  "SECURITY",
  "OWNER",
  "RESIDENT",
];

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  companyId?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Respuesta del backend en /auth/login. */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
  };
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
