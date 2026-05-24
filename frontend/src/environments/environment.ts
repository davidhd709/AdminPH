/**
 * Entorno de PRODUCCIÓN (valor por defecto).
 * Para desarrollo se reemplaza por environment.development.ts vía angular.json.
 * NO poner secretos aquí: el frontend es público.
 */
export const environment = {
  production: true,
  apiUrl: "/api/v1",
};
