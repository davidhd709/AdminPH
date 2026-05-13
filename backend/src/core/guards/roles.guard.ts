import type { CanActivate, ExecutionContext} from "@nestjs/common";
import { Injectable, ForbiddenException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      throw new ForbiddenException("User role not found");
    }

    // Superadmin can do everything
    if (user.role === "SUPERADMIN") {
      return true;
    }

    return requiredRoles.some((role) => user.role === role);
  }
}
