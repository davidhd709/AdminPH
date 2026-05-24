import { environment } from "../../../environments/environment";

/** Punto único de configuración de la API. */
export const API = {
  baseUrl: environment.apiUrl,
  auth: {
    login: "/auth/login",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
  },
  users: {
    me: "/users/me",
  },
  companies: "/companies",
} as const;
