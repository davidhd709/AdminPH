import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Unit, Prisma } from "@prisma/client";
import { CreateUnitDto, UpdateUnitDto } from "./dto/unit.dto";
import { AuditService } from "../audit/audit.service";
import { PaginatedResult, PaginationDto } from "../../core/dto/pagination.dto";
import { paginate } from "../../core/utils/paginate";

/** Unidad con refs livianas de copropiedad y torre (para "Mi unidad"). */
const unitWithRefs = Prisma.validator<Prisma.UnitDefaultArgs>()({
  include: {
    property: { select: { id: true, name: true } },
    tower: { select: { id: true, name: true } },
  },
});
export type UnitWithRefs = Prisma.UnitGetPayload<typeof unitWithRefs>;

@Injectable()
export class UnitsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Unidades del usuario actual: aquellas donde figura como propietario o
   * residente (vía Owner/Resident vinculados a su userId). Self-service para la
   * sección "Mi cuenta"; no requiere propertyId.
   */
  async findMine(user: { sub: string }): Promise<UnitWithRefs[]> {
    const [owners, residents] = await Promise.all([
      this.prisma.owner.findMany({
        where: { userId: user.sub, deletedAt: null },
        select: { unitId: true },
      }),
      this.prisma.resident.findMany({
        where: { userId: user.sub, deletedAt: null },
        select: { unitId: true },
      }),
    ]);
    const unitIds = [...new Set([...owners, ...residents].map((r) => r.unitId))];
    if (unitIds.length === 0) return [];
    return this.prisma.unit.findMany({
      where: { id: { in: unitIds }, deletedAt: null },
      ...unitWithRefs,
      orderBy: { code: "asc" },
    });
  }

  async create(dto: CreateUnitDto, user: any, request: any): Promise<Unit> {
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, deletedAt: null },
    });

    if (!property) throw new NotFoundException("Property not found");

    if (user.role !== "SUPERADMIN") {
      if (user.role === "COMPANY_ADMIN" && property.companyId !== user.companyId) {
        throw new ForbiddenException("Access denied");
      }
      if (!["COMPANY_ADMIN"].includes(user.role)) {
        const assignment = await this.prisma.propertyUser.findFirst({
          where: { userId: user.sub, propertyId: dto.propertyId },
        });
        if (!assignment) throw new ForbiddenException("Not assigned to this property");
      }
    }

    const unit = await this.prisma.unit.create({ data: dto });

    await this.auditService.log({
      userId: user.sub,
      companyId: property.companyId,
      propertyId: property.id,
      entityName: "Unit",
      entityId: unit.id,
      action: "CREATE",
      newValue: unit,
      request,
    });

    return unit;
  }

  async findAll(
    user: any,
    propertyId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Unit>> {
    if (user.role !== "SUPERADMIN") {
      const property = await this.prisma.property.findFirst({
        where: { id: propertyId, deletedAt: null },
      });
      if (!property) throw new NotFoundException("Property not found");

      if (user.role === "COMPANY_ADMIN" && property.companyId !== user.companyId) {
        throw new ForbiddenException("Access denied");
      }
      if (!["COMPANY_ADMIN"].includes(user.role)) {
        const assignment = await this.prisma.propertyUser.findFirst({
          where: { userId: user.sub, propertyId },
        });
        if (!assignment) throw new ForbiddenException("Not assigned to this property");
      }
    }

    return paginate<Unit>(this.prisma.unit, { propertyId, deletedAt: null }, pagination);
  }

  async findOne(
    id: string,
    user: any,
  ): Promise<Prisma.UnitGetPayload<{ include: { property: true } }>> {
    const unit = await this.prisma.unit.findFirst({
      where: { id, deletedAt: null },
      include: { property: true },
    });

    if (!unit) throw new NotFoundException("Unit not found");

    if (user.role !== "SUPERADMIN") {
      const property = unit.property;
      if (user.role === "COMPANY_ADMIN" && property.companyId !== user.companyId) {
        throw new ForbiddenException("Access denied");
      }
      if (!["COMPANY_ADMIN"].includes(user.role)) {
        const assignment = await this.prisma.propertyUser.findFirst({
          where: { userId: user.sub, propertyId: property.id },
        });
        if (!assignment) throw new ForbiddenException("Not assigned to this property");
      }
    }

    return unit;
  }

  async update(id: string, dto: UpdateUnitDto, user: any, request: any): Promise<Unit> {
    const oldUnit = await this.findOne(id, user);
    const updated = await this.prisma.unit.update({
      where: { id },
      data: dto,
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: oldUnit.property.companyId,
      propertyId: oldUnit.propertyId,
      entityName: "Unit",
      entityId: id,
      action: "UPDATE",
      oldValue: oldUnit,
      newValue: updated,
      request,
    });

    return updated;
  }

  async remove(id: string, user: any, request: any): Promise<Unit> {
    const oldUnit = await this.findOne(id, user);

    if (user.role !== "SUPERADMIN" && user.role !== "COMPANY_ADMIN") {
      throw new ForbiddenException("Insufficient permissions");
    }

    const deleted = await this.prisma.unit.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: oldUnit.property.companyId,
      propertyId: oldUnit.propertyId,
      entityName: "Unit",
      entityId: id,
      action: "DELETE",
      oldValue: oldUnit,
      newValue: deleted,
      request,
    });

    return deleted;
  }
}
