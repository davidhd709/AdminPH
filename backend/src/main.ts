import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Logger as PinoLogger } from "nestjs-pino";
import helmet from "helmet";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  // Pino como logger de toda la app (reemplaza el logger default de Nest).
  app.useLogger(app.get(PinoLogger));
  const logger = app.get(PinoLogger);
  const configService = app.get(ConfigService);
  const isProd = configService.get<string>("NODE_ENV") === "production";

  // Detrás de Nginx/CDN: confiar en X-Forwarded-* del primer hop.
  app.set("trust proxy", 1);

  // 1. Helmet con CSP estricto.
  // En dev se permite swagger-ui (inline scripts/styles).
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            useDefaults: true,
            directives: {
              "default-src": ["'self'"],
              "script-src": ["'self'"],
              "style-src": ["'self'", "'unsafe-inline'"],
              "img-src": ["'self'", "data:"],
              "object-src": ["'none'"],
              "frame-ancestors": ["'none'"],
              "form-action": ["'self'"],
              "upgrade-insecure-requests": [],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
      referrerPolicy: { policy: "no-referrer" },
    }),
  );

  // 2. CORS por env: lista de origins separados por coma. En prod NUNCA "*".
  const corsRaw =
    configService.get<string>("CORS_ORIGINS") ?? configService.get<string>("CORS_ORIGIN") ?? "";
  const corsOrigins = corsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (isProd && corsOrigins.length === 0) {
    throw new Error("CORS_ORIGINS must be set in production (lista separada por comas).");
  }

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    maxAge: 600,
  });

  // 3. Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      disableErrorMessages: isProd,
    }),
  );

  // 4. Swagger en dev/staging; en prod queda detrás de un guard manual.
  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("AdminPH API")
      .setDescription("SaaS for Horizontal Property Management in Colombia")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/docs", app, document);
  }

  const port = configService.get<number>("PORT") || 3000;
  await app.listen(port);
  logger.log(`🚀 AdminPH Backend running on: http://localhost:${port}`);
  if (!isProd) logger.log(`📖 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap().catch((exception) => {
  console.error(exception);
  process.exit(1);
});
