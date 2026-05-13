import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";
import type { Owner, Resident} from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { CreateOwnerDto, CreateResidentDto } from "./dto/people.dto";
import type { AuditService } from "../audit/audit.service";

@Injectable()
export class PeopleService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // Owners
  async createOwner(dto: CreateOwnerDto, user: any, request: any): Promise<Owner> {
    const unit = await this.prisma.unit.findFirst({
      where: { id: dto.unitId, deletedAt: null },
      include: { property: true },
    });

    if (!unit) throw new NotFoundException("Unit not found");

    if (user.role !== "SUPERADMIN") {
      if (user.role === "COMPANY_ADMIN" && unit.property.companyId !== user.companyId) {
        throw new ForbiddenException("Access denied");
      }
      if (!["COMPANY_ADMIN"].includes(user.role)) {
        const assignment = await this.prisma.propertyUser.findFirst({
          where: { userId: user.sub, propertyId: unit.propertyId },
        });
        if (!assignment) throw new ForbiddenException("Not assigned to this property");
      }
    }

    const owner = await this.prisma.owner.create({ data: dto });

    await this.auditService.log({
      userId: user.sub,
      companyId: unit.property.companyId,
      propertyId: unit.propertyId,
      entityName: "Owner",
      entityId: owner.id,
      action: "CREATE",
      newValue: owner,
      request,
    });

    return owner;
  }

  async findOwnersByUnit(unitId: string, user: any): Promise<Owner[]> {
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, deletedAt: null },
      include: { property: true },
    });

    if (!unit) throw new NotFoundException("Unit not found");

    if (user.role !== "SUPERADMIN") {
      if (user.role === "COMPANY_ADMIN" && unit.property.companyId !== user.companyId) {
        throw new ForbiddenException("Access denied");
      }
      if (!["COMPANY_ADMIN"].includes(user.role)) {
        const assignment = await this.prisma.propertyUser.findFirst({
          where: { userId: user.sub, propertyId: unit.propertyId },
        });
        if (!assignment) throw new ForbiddenException("Not assigned to this property");
      }
    }

    return this.prisma.owner.findMany({
      where: { unitId, deletedAt: null },
    });
  }

  async removeOwner(id: string, user: any, request: any): Promise<Owner> {
    const owner = await this.prisma.owner.findFirst({
      where: { id, deletedAt: null },
      include: { unit: { include: { property: true } } },
    });

    if (!owner) throw new NotFoundException("Owner not found");

    if (user.role !== "SUPERADMIN" && user.role !== "COMPANY_ADMIN") {
      const assignment = await this.prisma.propertyUser.findFirst({
        where: { userId: user.sub, propertyId: owner.unit.propertyId },
      });
      if (!assignment) throw new ForbiddenException("Insufficient permissions");
    }

    const deleted = await this.prisma.owner.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: owner.unit.property.companyId,
      propertyId: owner.unit.propertyId,
      entityName: "Owner",
      entityId: id,
      action: "DELETE",
      oldValue: owner,
      newValue: deleted,
      request,
    });

    return deleted;
  }

  // Residents
  async createResident(dto: CreateResidentDto, user: any, request: any): Promise<Resident> {
    const unit = await this.prisma.unit.findFirst({
      where: { id: dto.unitId, deletedAt: null },
      include: { property: true },
    });

    if (!unit) throw new NotFoundException("Unit not found");

    if (user.role !== "SUPERADMIN") {
      if (user.role === "COMPANY_ADMIN" && unit.property.companyId !== user.companyId) {
        throw new ForbiddenException("Access denied");
      }
      if (!["COMPANY_ADMIN"].includes(user.role)) {
        const assignment = await this.prisma.propertyUser.findFirst({
          where: { userId: user.sub, propertyId: unit.propertyId },
        });
        if (!assignment) throw new ForbiddenException("Not assigned to this property");
      }
    }

    const resident = await this.prisma.resident.create({ data: dto });

    await this.auditService.log({
      userId: user.sub,
      companyId: unit.property.companyId,
      propertyId: unit.propertyId,
      entityName: "Resident",
      entityId: resident.id,
      action: "CREATE",
      newValue: resident,
      request,
    });

    return resident;
  }

  async findResidentsByUnit(unitId: string, user: any): Promise<Resident[]> {
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, deletedAt: null },
      include: { property: true },
    });

    if (!unit) throw new NotFoundException("Unit not found");

    if (user.role !== "SUPERADMIN") {
      if (user.role === "COMPANY_ADMIN" && unit.property.companyId !== user.companyId) {
        throw new ForbiddenException("Access denied");
      }
      if (!["COMPANY_ADMIN"].includes(user.role)) {
        const assignment = await this.prisma.propertyUser.findFirst({
          where: { userId: user.sub, propertyId: unit.propertyId },
        });
        if (!assignment) throw new ForbiddenException("Not assigned to this property");
      }
    }

    return this.prisma.resident.findMany({
      where: { unitId, deletedAt: null },
    });
  }

  async removeResident(id: string, user: any, request: any): Promise<Resident> {
    const resident = await this.prisma.resident.findFirst({
      where: { id, deletedAt: null },
      include: { unit: { include: { property: true } } },
    });

    if (!resident) throw new NotFoundException("Resident not found");

    if (user.role !== "SUPERADMIN" && user.role !== "COMPANY_ADMIN") {
      const assignment = await this.prisma.propertyUser.findFirst({
        where: { userId: user.sub, propertyId: resident.unit.propertyId },
      });
      if (!assignment) throw new ForbiddenException("Insufficient permissions");
    }

    const deleted = await this.prisma.resident.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: resident.unit.property.companyId,
      propertyId: resident.unit.propertyId,
      entityName: "Resident",
      entityId: id,
      action: "DELETE",
      oldValue: resident,
      newValue: deleted,
      request,
    });

    return deleted;
  }
}
