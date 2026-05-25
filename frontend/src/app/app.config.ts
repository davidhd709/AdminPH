import { registerLocaleData } from "@angular/common";
import localeEsCo from "@angular/common/locales/es-CO";
import {
  ApplicationConfig,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from "@angular/core";
import { provideRouter, withComponentInputBinding } from "@angular/router";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { providePrimeNG } from "primeng/config";
import { MessageService } from "primeng/api";

import { routes } from "./app.routes";
import { AdminPHPreset } from "./core/config/theme.preset";
import { authInterceptor } from "./core/interceptors/auth.interceptor";
import { refreshInterceptor } from "./core/interceptors/refresh.interceptor";
import { errorInterceptor } from "./core/interceptors/error.interceptor";
import { initSession } from "./core/auth/session.init";

registerLocaleData(localeEsCo);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([authInterceptor, refreshInterceptor, errorInterceptor]),
    ),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: AdminPHPreset,
        options: {
          // Modo claro fijo en esta fase (sin dark mode).
          darkModeSelector: false,
          // PrimeNG escribe en la capa "primeng" (ver orden en styles.css).
          cssLayer: {
            name: "primeng",
            order: "tailwind-base, primeng, tailwind-utilities",
          },
        },
      },
    }),
    MessageService,
    { provide: LOCALE_ID, useValue: "es-CO" },
    provideAppInitializer(initSession),
  ],
};
