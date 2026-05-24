/**
 * Plantilla de configuración de entorno (sin valores sensibles).
 * Copiar a environment.ts / environment.development.ts y ajustar `apiUrl`.
 * El frontend NUNCA debe contener secretos (tokens, claves API, etc.).
 */
export const environment = {
  production: false,
  apiUrl: "http://localhost:3000/api/v1",
};
