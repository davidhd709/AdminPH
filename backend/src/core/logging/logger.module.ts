import { randomUUID } from "crypto";
import { IncomingMessage, ServerResponse } from "http";
import { LoggerModule } from "nestjs-pino";

const isProd = process.env.NODE_ENV === "production";

/**
 * LoggerModule (Pino) configurado para toda la app.
 *
 * - dev: salida pretty legible.
 * - prod: JSON estructurado (un objeto por línea) para ingestión por
 *   Loki/Datadog/CloudWatch.
 * - genReqId: usa X-Request-Id entrante o genera un UUID. Se expone en el
 *   header de respuesta X-Request-Id (correlation id end-to-end).
 * - redact: nunca loguea credenciales ni tokens.
 */
export const AppLoggerModule = LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
    transport: isProd
      ? undefined
      : {
          target: "pino-pretty",
          options: {
            singleLine: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
    genReqId: (req: IncomingMessage, res: ServerResponse) => {
      const incoming = req.headers["x-request-id"];
      const id = (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
      res.setHeader("X-Request-Id", id);
      return id;
    },
    customProps: (req: IncomingMessage & { user?: { sub?: string } }) => ({
      userId: req.user?.sub,
    }),
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.body.password",
        "req.body.refresh_token",
        'res.headers["set-cookie"]',
      ],
      remove: true,
    },
    // No loguear el ruido de health checks.
    autoLogging: {
      ignore: (req: IncomingMessage) => {
        const url = req.url ?? "";
        return url.startsWith("/health") || url.startsWith("/live") || url.startsWith("/ready");
      },
    },
  },
});
