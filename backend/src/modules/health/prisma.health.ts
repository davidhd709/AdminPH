import { Injectable } from "@nestjs/common";
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Health indicator que verifica conectividad con PostgreSQL ejecutando un
 * `SELECT 1` vía Prisma.
 */
@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      throw new HealthCheckError("Prisma check failed", this.getStatus(key, false, { message }));
    }
  }
}
