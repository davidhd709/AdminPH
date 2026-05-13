import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Property } from "@prisma/client";
import { CreatePropertyDto, UpdatePropertyDto } from "./dto/property.dto";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class PropertiesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(dto: CreatePropertyDto, user: any, request: any): Promise<Property> {
    if (user.role !== "SUPERADMIN" && user.companyId !== dto.companyId) {
      throw new ForbiddenException("You cannot create properties for other companies");
    }

    const property = await this.prisma.property.create({
      data: dto,
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: property.companyId,
      propertyId: property.id,
      entityName: "Property",
      entityId: property.id,
      action: "CREATE",
      newValue: property,
      request,
    });

    return property;
  }

  async findAll(user: any): Promise<Property[]> {
    const where: any = { deletedAt: null };

    if (user.role === "SUPERADMIN") {
      // Superadmin sees all
    } else if (user.role === "COMPANY_ADMIN") {
      where.companyId = user.companyId;
    } else {
      const propertyUsers = await this.prisma.propertyUser.findMany({
        where: { userId: user.sub },
        select: { propertyId: true },
      });
      where.id = { in: propertyUsers.map((pu) => pu.propertyId) };
    }

    return this.prisma.property.findMany({ where });
  }

  async findOne(id: string, user: any): Promise<Property | null> {
    const property = await this.prisma.property.findFirst({
      where: { id, deletedAt: null },
    });

    if (!property) throw new NotFoundException("Property not found");

    if (user.role !== "SUPERADMIN") {
      if (user.role === "COMPANY_ADMIN" && property.companyId !== user.companyId) {
        throw new ForbiddenException("Access denied to this property");
      }
      if (!["COMPANY_ADMIN"].includes(user.role)) {
        const assignment = await this.prisma.propertyUser.findFirst({
          where: { userId: user.sub, propertyId: id },
        });
        if (!assignment) throw new ForbiddenException("You are not assigned to this property");
      }
    }

    return property;
  }

  async update(id: string, dto: UpdatePropertyDto, user: any, request: any): Promise<Property> {
    const oldProperty = await this.findOne(id, user);

    const updated = await this.prisma.property.update({
      where: { id },
      data: dto,
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: updated.companyId,
      propertyId: updated.id,
      entityName: "Property",
      entityId: updated.id,
      action: "UPDATE",
      oldValue: oldProperty,
      newValue: updated,
      request,
    });

    return updated;
  }

  async remove(id: string, user: any, request: any): Promise<Property> {
    const oldProperty = await this.findOne(id, user);

    if (user.role !== "SUPERADMIN" && user.role !== "COMPANY_ADMIN") {
      throw new ForbiddenException("Insufficient permissions to delete property");
    }

    const deleted = await this.prisma.property.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: deleted.companyId,
      propertyId: deleted.id,
      entityName: "Property",
      entityId: deleted.id,
      action: "DELETE",
      oldValue: oldProperty,
      newValue: deleted,
      request,
    });

    return deleted;
  }
}
