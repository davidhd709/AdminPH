import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Marca un endpoint como público: salta JwtAuthGuard, RolesGuard y TenancyGuard.
 * Úsalo en endpoints de login, refresh, health, etc.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
