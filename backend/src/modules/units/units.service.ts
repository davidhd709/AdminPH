import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";
import type { Unit, Prisma } from "@prisma/client";
import type { CreateUnitDto, UpdateUnitDto } from "./dto/unit.dto";
import type { AuditService } from "../audit/audit.service";

@Injectable()
export class UnitsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

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

  async findAll(user: any, propertyId: string): Promise<Unit[]> {
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

    return this.prisma.unit.findMany({
      where: { propertyId, deletedAt: null },
    });
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
