import type { CanActivate, ExecutionContext} from "@nestjs/common";
import { Injectable, ForbiddenException } from "@nestjs/common";
import type { PrismaService } from "../../modules/prisma/prisma.service";

@Injectable()
export class TenancyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    // SUPERADMIN bypasses all tenancy checks
    if (user.role === "SUPERADMIN") return true;

    // 1. Company Isolation
    const requestedCompanyId = request.params.companyId || request.query.companyId;
    if (requestedCompanyId && requestedCompanyId !== user.companyId) {
      throw new ForbiddenException("Access denied: You do not belong to this company");
    }

    // 2. Property Isolation
    const requestedPropertyId = request.params.propertyId || request.query.propertyId;
    if (requestedPropertyId) {
      const propertyUser = await this.prisma.propertyUser.findFirst({
        where: {
          userId: user.sub,
          propertyId: requestedPropertyId,
        },
      });

      if (!propertyUser) {
        throw new ForbiddenException("Access denied: You are not assigned to this property");
      }
    }

    return true;
  }
}
