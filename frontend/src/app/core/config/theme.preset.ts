import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";

/**
 * Preset de PrimeNG para AdminPH: Aura con la marca azul como color primario
 * (#2563EB = `blue-600` de Tailwind), para que botones, foco y acentos de
 * PrimeNG combinen con las utilidades de Tailwind. No cambia PrimeNG ni el
 * preset Aura; solo redefine la paleta semántica `primary`.
 */
export const AdminPHPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
      950: "#172554",
    },
  },
});
