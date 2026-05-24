import { INestApplication, ValidationPipe, VersioningType } from "@nestjs/common";

/**
 * Configuración de la app que debe ser idéntica en producción (main.ts) y en
 * los tests E2E. Mantenerla acá garantiza que los tests ejercitan la misma
 * superficie que producción (prefijo /api, versionado v1, ValidationPipe).
 *
 * Lo específico de bootstrap (Helmet, CORS, Swagger, trust proxy) vive en
 * main.ts porque no es relevante para los tests y depende de ConfigService.
 */
export function configureApp(app: INestApplication): void {
  const isProd = process.env.NODE_ENV === "production";

  app.setGlobalPrefix("api", { exclude: ["health", "live", "ready"] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      disableErrorMessages: isProd,
    }),
  );
}
