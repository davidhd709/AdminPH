import type { UserRole } from "@prisma/client";

/**
 * Payload del JWT, inyectado en `request.user` por JwtAuthGuard.
 * Refleja lo que firma `AuthService.generateTokens`.
 */
export interface AuthUser {
  sub: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  iat?: number;
  exp?: number;
}
