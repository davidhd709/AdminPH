/**
 * Entorno de DESARROLLO. Apunta al backend NestJS local (/api/v1 en :3000).
 * NO poner secretos aquí: el frontend es público.
 */
export const environment = {
  production: false,
  apiUrl: "http://localhost:3000/api/v1",
};
