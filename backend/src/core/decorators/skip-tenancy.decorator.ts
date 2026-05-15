import { SetMetadata } from "@nestjs/common";

export const SKIP_TENANCY_KEY = "skipTenancy";

/**
 * Marca un endpoint para saltar TenancyGuard pero conservar JwtAuthGuard y RolesGuard.
 * Útil para endpoints administrativos globales (ej. SUPERADMIN listando empresas).
 * Para endpoints totalmente públicos usar `@Public()`.
 */
export const SkipTenancy = () => SetMetadata(SKIP_TENANCY_KEY, true);
