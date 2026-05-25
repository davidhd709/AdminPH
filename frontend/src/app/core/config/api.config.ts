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
    base: "/users",
    me: "/users/me",
    changePassword: "/users/me/change-password",
  },
  companies: "/companies",
  properties: "/properties",
  towers: "/towers",
  units: "/units",
  people: {
    owners: "/people/owners",
    residents: "/people/residents",
  },
  finance: {
    concepts: "/finance/fee-concepts",
    fees: "/finance/fees",
  },
  payments: "/payments",
  accounting: {
    bankAccounts: "/accounting/bank-accounts",
    categories: "/accounting/categories",
    transactions: "/accounting/transactions",
  },
  reports: "/reports",
  pqr: "/pqr",
  announcements: "/announcements",
  reservations: {
    base: "/reservations",
    areas: "/reservations/areas",
  },
  visitors: "/visitors",
  registry: {
    pets: "/registry/pets",
    vehicles: "/registry/vehicles",
  },
  assemblies: "/assemblies",
  documents: "/documents",
} as const;
