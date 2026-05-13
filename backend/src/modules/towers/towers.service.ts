import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Tower, Prisma } from "@prisma/client";
import { CreateTowerDto, UpdateTowerDto } from "./dto/tower.dto";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class TowersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateTowerDto, user: any, request: any): Promise<Tower> {
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, deletedAt: null },
    });

    if (!property) throw new NotFoundException("Property not found");

    if (user.role !== "SUPERADMIN") {
      if (user.role === "COMPANY_ADMIN" && property.companyId !== user.companyId) {
        throw new ForbiddenException("Access denied to this company");
      }
      if (!["COMPANY_ADMIN"].includes(user.role)) {
        const assignment = await this.prisma.propertyUser.findFirst({
          where: { userId: user.sub, propertyId: dto.propertyId },
        });
        if (!assignment) throw new ForbiddenException("You are not assigned to this property");
      }
    }

    const tower = await this.prisma.tower.create({ data: dto });

    await this.auditService.log({
      userId: user.sub,
      companyId: property.companyId,
      propertyId: property.id,
      entityName: "Tower",
      entityId: tower.id,
      action: "CREATE",
      newValue: tower,
      request,
    });

    return tower;
  }

  async findAll(user: any, propertyId: string): Promise<Tower[]> {
    // Validate access to property first
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

    return this.prisma.tower.findMany({
      where: { propertyId, deletedAt: null },
    });
  }

  async findOne(
    id: string,
    user: any,
  ): Promise<Prisma.TowerGetPayload<{ include: { property: true } }>> {
    const tower = await this.prisma.tower.findFirst({
      where: { id, deletedAt: null },
      include: { property: true },
    });

    if (!tower) throw new NotFoundException("Tower not found");

    if (user.role !== "SUPERADMIN") {
      const property = tower.property;
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

    return tower;
  }

  async update(id: string, dto: UpdateTowerDto, user: any, request: any): Promise<Tower> {
    const oldTower = await this.findOne(id, user);
    const updated = await this.prisma.tower.update({
      where: { id },
      data: dto,
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: oldTower.property.companyId,
      propertyId: oldTower.propertyId,
      entityName: "Tower",
      entityId: id,
      action: "UPDATE",
      oldValue: oldTower,
      newValue: updated,
      request,
    });

    return updated;
  }

  async remove(id: string, user: any, request: any): Promise<Tower> {
    const oldTower = await this.findOne(id, user);

    if (user.role !== "SUPERADMIN" && user.role !== "COMPANY_ADMIN") {
      throw new ForbiddenException("Insufficient permissions");
    }

    const deleted = await this.prisma.tower.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: oldTower.property.companyId,
      propertyId: oldTower.propertyId,
      entityName: "Tower",
      entityId: id,
      action: "DELETE",
      oldValue: oldTower,
      newValue: deleted,
      request,
    });

    return deleted;
  }
}
