import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { HealthCheck, HealthCheckService, MemoryHealthIndicator } from "@nestjs/terminus";
import { ApiTags } from "@nestjs/swagger";
import { PrismaHealthIndicator } from "./prisma.health";
import { Public } from "../../core/decorators/public.decorator";

@ApiTags("health")
@Controller({ version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  /**
   * Liveness: el proceso está vivo. No toca dependencias externas.
   * Para k8s livenessProbe.
   */
  @Public()
  @Get("live")
  live() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  /**
   * Readiness: listo para recibir tráfico (BD accesible).
   * Para k8s readinessProbe.
   */
  @Public()
  @Get("ready")
  @HealthCheck()
  ready() {
    return this.health.check([() => this.prismaIndicator.pingCheck("database")]);
  }

  /**
   * Health completo: BD + memoria. Para dashboards y uptime monitors.
   */
  @Public()
  @Get("health")
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaIndicator.pingCheck("database"),
      () => this.memory.checkHeap("memory_heap", 512 * 1024 * 1024),
    ]);
  }
}
