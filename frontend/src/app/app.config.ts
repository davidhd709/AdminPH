import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from "@angular/core";
import { provideRouter, withComponentInputBinding } from "@angular/router";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { providePrimeNG } from "primeng/config";
import { MessageService } from "primeng/api";
import Aura from "@primeuix/themes/aura";

import { routes } from "./app.routes";
import { authInterceptor } from "./core/interceptors/auth.interceptor";
import { refreshInterceptor } from "./core/interceptors/refresh.interceptor";
import { errorInterceptor } from "./core/interceptors/error.interceptor";
import { initSession } from "./core/auth/session.init";

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
        preset: Aura,
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
    provideAppInitializer(initSession),
  ],
};
