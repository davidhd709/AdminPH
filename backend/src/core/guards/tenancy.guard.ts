import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { PrismaService } from "../../modules/prisma/prisma.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { SKIP_TENANCY_KEY } from "../decorators/skip-tenancy.decorator";

/**
 * TenancyGuard — defensa global contra cross-tenant leakage.
 *
 * Política:
 * - Si el endpoint es @Public(), pasa.
 * - Si el endpoint es @SkipTenancy(), pasa (ya pasó JwtAuthGuard/RolesGuard).
 * - Si no hay user en request (no debería pasar si JwtAuthGuard corrió antes), rechaza.
 * - SUPERADMIN siempre pasa.
 * - Para el resto: si en body/query/params viene un `companyId` distinto al del user,
 *   rechaza. Si viene un `propertyId`, valida que el user tenga relación (PropertyUser)
 *   con esa propiedad (o que sea de la misma compañía, caso COMPANY_ADMIN).
 *
 * Defense in depth: los services SIGUEN validando tenancy en sus queries.
 * Este guard captura el caso de un controller que olvide hacerlo.
 */
@Injectable()
export class TenancyGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const skipTenancy = this.reflector.getAllAndOverride<boolean>(SKIP_TENANCY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipTenancy) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Tenancy check requires authenticated user");
    }

    if (user.role === "SUPERADMIN") return true;

    const requestedCompanyId = this.pickId(request, "companyId");
    if (requestedCompanyId && requestedCompanyId !== user.companyId) {
      throw new ForbiddenException("Access denied: cross-company request");
    }

    const requestedPropertyId = this.pickId(request, "propertyId");
    if (requestedPropertyId) {
      if (user.role === "COMPANY_ADMIN") {
        const property = await this.prisma.property.findFirst({
          where: { id: requestedPropertyId, deletedAt: null },
          select: { companyId: true },
        });
        if (!property || property.companyId !== user.companyId) {
          throw new ForbiddenException("Access denied to this property");
        }
      } else {
        const propertyUser = await this.prisma.propertyUser.findFirst({
          where: { userId: user.sub, propertyId: requestedPropertyId },
        });
        if (!propertyUser) {
          throw new ForbiddenException("Access denied: not assigned to this property");
        }
      }
    }

    return true;
  }

  /**
   * Busca un id en params, query y body. Acepta también claves equivalentes
   * (`id` en params del controller correspondiente — esto requiere conocer
   * el contexto, así que NO se hace acá; cada service sigue siendo responsable
   * de validar `id` semántico).
   */
  private pickId(request: Request, key: "companyId" | "propertyId"): string | undefined {
    const fromParams = (request.params as Record<string, string | undefined>)[key];
    if (fromParams) return fromParams;

    const fromQuery = request.query[key];
    if (typeof fromQuery === "string") return fromQuery;

    const body = request.body as Record<string, unknown> | undefined;
    if (body && typeof body[key] === "string") return body[key] as string;

    return undefined;
  }
}
