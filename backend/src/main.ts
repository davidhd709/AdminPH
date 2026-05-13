import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  // 1. Security Middleware
  app.use(helmet());
  app.enableCors({
    origin: configService.get<string>("CORS_ORIGIN") || "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });

  // 2. Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 3. Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle("AdminPH API")
    .setDescription("SaaS for Horizontal Property Management in Colombia")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = configService.get<number>("PORT") || 3000;
  await app.listen(port);
  logger.log(`🚀 AdminPH Backend running on: http://localhost:${port}`);
  logger.log(`📖 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap().catch((exception) => {
  console.error(exception);
});
