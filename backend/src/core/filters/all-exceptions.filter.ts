import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Request, Response } from "express";

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  code?: string;
  requestId?: string;
  timestamp: string;
  path: string;
}

/**
 * Filtro global que unifica el formato de TODOS los errores y traduce errores
 * conocidos de Prisma a códigos HTTP correctos. Loguea 5xx como error y 4xx
 * como warn, incluyendo el requestId para correlación.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    const body = this.buildBody(exception, request);

    if (body.statusCode >= 500) {
      this.logger.error(
        `[${body.requestId ?? "-"}] ${request.method} ${request.url} -> ${body.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `[${body.requestId ?? "-"}] ${request.method} ${request.url} -> ${body.statusCode}: ${
          Array.isArray(body.message) ? body.message.join("; ") : body.message
        }`,
      );
    }

    response.status(body.statusCode).json(body);
  }

  private buildBody(exception: unknown, request: Request & { id?: string }): ErrorBody {
    const base = {
      requestId: request.id,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === "string"
          ? res
          : ((res as { message?: string | string[] }).message ?? exception.message);
      const error =
        typeof res === "object" && (res as { error?: string }).error
          ? (res as { error: string }).error
          : (HttpStatus[status] ?? "Error");
      return { statusCode: status, error, message, ...base };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return { ...this.mapPrismaError(exception), ...base };
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        error: "Bad Request",
        message: "Invalid database query parameters",
        code: "PRISMA_VALIDATION",
        ...base,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: "Internal Server Error",
      message: "Unexpected error",
      ...base,
    };
  }

  private mapPrismaError(e: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    error: string;
    message: string;
    code: string;
  } {
    switch (e.code) {
      case "P2002": {
        const target = (e.meta?.target as string[] | undefined)?.join(", ") ?? "field";
        return {
          statusCode: HttpStatus.CONFLICT,
          error: "Conflict",
          message: `Unique constraint failed on: ${target}`,
          code: e.code,
        };
      }
      case "P2025":
        return {
          statusCode: HttpStatus.NOT_FOUND,
          error: "Not Found",
          message: "Record not found",
          code: e.code,
        };
      case "P2003":
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: "Bad Request",
          message: "Foreign key constraint failed",
          code: e.code,
        };
      default:
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: "Bad Request",
          message: "Database request error",
          code: e.code,
        };
    }
  }
}
