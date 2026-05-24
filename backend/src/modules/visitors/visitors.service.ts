import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Visitor } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PaginatedResult, PaginationDto } from "../../core/dto/pagination.dto";
import { paginate } from "../../core/utils/paginate";
import { AuthUser } from "../../core/types/auth-user";
import { CreateVisitorDto, VisitorQueryDto } from "./dto/visitor.dto";

/** Roles de staff que pueden gestionar y consultar la bitácora de portería. */
const STAFF_ROLES = ["SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN"];

/** Roles con acceso operativo a la portería (staff + portería). */
const PORTERIA_ROLES = [...STAFF_ROLES, "SECURITY"];

@Injectable()
export class VisitorsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async register(dto: CreateVisitorDto, user: AuthUser, request: unknown): Promise<Visitor> {
    if (!PORTERIA_ROLES.includes(user.role)) {
      throw new ForbiddenException("Only security or staff can register visitors");
    }

    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, deletedAt: null },
    });
    if (!property) throw new NotFoundException("Property not found");

    await this.assertPropertyAccess(user, property.id, property.companyId);

    if (dto.unitId) {
      const unit = await this.prisma.unit.findFirst({
        where: { id: dto.unitId, propertyId: property.id, deletedAt: null },
      });
      if (!unit) throw new NotFoundException("Unit not found in this property");
    }

    const visitor = await this.prisma.visitor.create({
      data: {
        companyId: property.companyId,
        propertyId: property.id,
        unitId: dto.unitId ?? null,
        registeredById: user.sub,
        fullName: dto.fullName,
        document: dto.document ?? null,
        type: dto.type ?? "VISITOR",
        notes: dto.notes ?? null,
      },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: property.companyId,
      propertyId: property.id,
      entityName: "Visitor",
      entityId: visitor.id,
      action: "CREATE",
      newValue: visitor,
      request,
    });

    return visitor;
  }

  async registerExit(id: string, user: AuthUser, request: unknown): Promise<Visitor> {
    if (!PORTERIA_ROLES.includes(user.role)) {
      throw new ForbiddenException("Only security or staff can register an exit");
    }

    const visitor = await this.prisma.visitor.findFirst({ where: { id } });
    if (!visitor) throw new NotFoundException("Visitor not found");

    await this.assertPropertyAccess(user, visitor.propertyId, visitor.companyId);

    if (visitor.exitAt) {
      throw new BadRequestException("Exit already registered for this visitor");
    }

    const updated = await this.prisma.visitor.update({
      where: { id },
      data: { exitAt: new Date() },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: visitor.companyId,
      propertyId: visitor.propertyId,
      entityName: "Visitor",
      entityId: id,
      action: "UPDATE",
      oldValue: { exitAt: visitor.exitAt },
      newValue: { exitAt: updated.exitAt },
      request,
    });

    return updated;
  }

  async findAll(
    user: AuthUser,
    query: VisitorQueryDto,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Visitor>> {
    const where = await this.buildScopedWhere(user, query.propertyId);
    if (query.type) where.type = query.type;

    return paginate<Visitor>(this.prisma.visitor, where, pagination, {
      defaultSortBy: "entryAt",
    });
  }

  async findOne(id: string, user: AuthUser): Promise<Visitor> {
    const where = await this.buildScopedWhere(user);
    where.id = id;

    const visitor = await this.prisma.visitor.findFirst({ where });
    if (!visitor) throw new NotFoundException("Visitor not found");
    return visitor;
  }

  // ===== Helpers de acceso =====

  /**
   * Arma el `where` con el scoping de lectura de la bitácora. La portería es
   * operativa: solo staff + SECURITY acceden; OWNER/RESIDENT quedan fuera.
   */
  private async buildScopedWhere(
    user: AuthUser,
    propertyId?: string,
  ): Promise<Record<string, unknown>> {
    const where: Record<string, unknown> = {};

    if (user.role === "SUPERADMIN") {
      if (propertyId) where.propertyId = propertyId;
    } else if (user.role === "COMPANY_ADMIN") {
      where.companyId = user.companyId;
      if (propertyId) where.propertyId = propertyId;
    } else if (user.role === "PROPERTY_ADMIN" || user.role === "SECURITY") {
      const assigned = await this.assignedPropertyIds(user.sub);
      where.propertyId = { in: assigned };
    } else {
      // OWNER/RESIDENT (u otros) no tienen acceso a la bitácora de portería.
      throw new ForbiddenException("Portería log is staff-only");
    }

    return where;
  }

  private async assignedPropertyIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.propertyUser.findMany({
      where: { userId },
      select: { propertyId: true },
    });
    return rows.map((r) => r.propertyId);
  }

  private async assertPropertyAccess(
    user: AuthUser,
    propertyId: string,
    companyId: string,
  ): Promise<void> {
    if (user.role === "SUPERADMIN") return;
    if (user.role === "COMPANY_ADMIN") {
      if (companyId !== user.companyId) throw new ForbiddenException("Cross-company access denied");
      return;
    }
    const assignment = await this.prisma.propertyUser.findFirst({
      where: { userId: user.sub, propertyId },
    });
    if (!assignment) throw new ForbiddenException("Not assigned to this property");
  }
}
