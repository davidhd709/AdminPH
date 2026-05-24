import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Pqr } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PaginatedResult, PaginationDto } from "../../core/dto/pagination.dto";
import { paginate } from "../../core/utils/paginate";
import { AuthUser } from "../../core/types/auth-user";
import { CreatePqrDto, PqrQueryDto, RespondPqrDto, UpdatePqrStatusDto } from "./dto/pqr.dto";

/** Roles con potestad de gestionar (cambiar estado / responder oficialmente) PQRs. */
const STAFF_ROLES = ["SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN"];

/** Radicado legible derivado del ticketNumber autoincremental. */
export function buildRadicado(pqr: { ticketNumber: number; createdAt: Date }): string {
  // UTC para que el año del radicado sea estable independientemente de la
  // zona horaria del servidor.
  const year = pqr.createdAt.getUTCFullYear();
  return `PQR-${year}-${String(pqr.ticketNumber).padStart(6, "0")}`;
}

@Injectable()
export class PqrService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(dto: CreatePqrDto, user: AuthUser, request: unknown): Promise<Pqr> {
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

    const pqr = await this.prisma.pqr.create({
      data: {
        companyId: property.companyId,
        propertyId: property.id,
        unitId: dto.unitId ?? null,
        createdById: user.sub,
        category: dto.category,
        subject: dto.subject,
        description: dto.description,
      },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: property.companyId,
      propertyId: property.id,
      entityName: "Pqr",
      entityId: pqr.id,
      action: "CREATE",
      newValue: { ...pqr, radicado: buildRadicado(pqr) },
      request,
    });

    return pqr;
  }

  async findAll(
    user: AuthUser,
    query: PqrQueryDto,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Pqr>> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;

    if (user.role === "SUPERADMIN") {
      if (query.propertyId) where.propertyId = query.propertyId;
    } else if (user.role === "COMPANY_ADMIN") {
      where.companyId = user.companyId;
      if (query.propertyId) where.propertyId = query.propertyId;
    } else if (STAFF_ROLES.includes(user.role)) {
      // PROPERTY_ADMIN: solo sus propiedades asignadas.
      const assigned = await this.assignedPropertyIds(user.sub);
      where.propertyId = { in: assigned };
    } else {
      // OWNER/RESIDENT/SECURITY: solo las PQR que ellos crearon.
      where.createdById = user.sub;
    }

    return paginate<Pqr>(this.prisma.pqr, where, pagination);
  }

  async findOne(id: string, user: AuthUser): Promise<Pqr & { radicado: string }> {
    const pqr = await this.prisma.pqr.findFirst({
      where: { id, deletedAt: null },
      include: { responses: { orderBy: { createdAt: "asc" } } },
    });
    if (!pqr) throw new NotFoundException("PQR not found");

    await this.assertReadAccess(user, pqr);
    return { ...pqr, radicado: buildRadicado(pqr) };
  }

  async updateStatus(
    id: string,
    dto: UpdatePqrStatusDto,
    user: AuthUser,
    request: unknown,
  ): Promise<Pqr> {
    const pqr = await this.prisma.pqr.findFirst({ where: { id, deletedAt: null } });
    if (!pqr) throw new NotFoundException("PQR not found");
    if (!STAFF_ROLES.includes(user.role)) {
      throw new ForbiddenException("Only staff can change PQR status");
    }
    await this.assertPropertyAccess(user, pqr.propertyId, pqr.companyId);

    const updated = await this.prisma.pqr.update({
      where: { id },
      data: { status: dto.status },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: pqr.companyId,
      propertyId: pqr.propertyId,
      entityName: "Pqr",
      entityId: id,
      action: "UPDATE",
      oldValue: { status: pqr.status },
      newValue: { status: updated.status },
      request,
    });

    return updated;
  }

  async respond(id: string, dto: RespondPqrDto, user: AuthUser, request: unknown) {
    const pqr = await this.prisma.pqr.findFirst({ where: { id, deletedAt: null } });
    if (!pqr) throw new NotFoundException("PQR not found");
    await this.assertReadAccess(user, pqr);

    const response = await this.prisma.pqrResponse.create({
      data: { pqrId: id, authorId: user.sub, message: dto.message },
    });

    // La primera respuesta de staff mueve la PQR a IN_PROGRESS.
    if (pqr.status === "OPEN" && STAFF_ROLES.includes(user.role)) {
      await this.prisma.pqr.update({ where: { id }, data: { status: "IN_PROGRESS" } });
    }

    await this.auditService.log({
      userId: user.sub,
      companyId: pqr.companyId,
      propertyId: pqr.propertyId,
      entityName: "PqrResponse",
      entityId: response.id,
      action: "CREATE",
      newValue: response,
      request,
    });

    return response;
  }

  // ===== Helpers de acceso =====

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

  private async assertReadAccess(user: AuthUser, pqr: Pqr): Promise<void> {
    if (user.role === "SUPERADMIN") return;
    if (user.role === "COMPANY_ADMIN") {
      if (pqr.companyId !== user.companyId) throw new ForbiddenException("Access denied");
      return;
    }
    if (STAFF_ROLES.includes(user.role)) {
      await this.assertPropertyAccess(user, pqr.propertyId, pqr.companyId);
      return;
    }
    // Autor puede leer su propia PQR.
    if (pqr.createdById !== user.sub) throw new ForbiddenException("Access denied to this PQR");
  }
}
