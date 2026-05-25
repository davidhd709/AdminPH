import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";

/** Escala azul (Tailwind blue) usada por la marca. */
const BLUE = {
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
};

/**
 * Preset de PrimeNG para AdminPH (design system de Stitch): Aura con la marca
 * azul profunda `#1E40AF` (= blue-800) como color primario para botones, foco y
 * acentos. No cambia PrimeNG ni el preset Aura; solo redefine la paleta `primary`
 * y, en modo claro, el tono activo del primario para que coincida con #1E40AF.
 */
export const AdminPHPreset = definePreset(Aura, {
  semantic: {
    primary: BLUE,
    colorScheme: {
      light: {
        primary: {
          color: "{primary.800}", // #1E40AF
          contrastColor: "#ffffff",
          hoverColor: "{primary.900}", // #1E3A8A
          activeColor: "{primary.950}", // #172554
        },
      },
    },
  },
});
