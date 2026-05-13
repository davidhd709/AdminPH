import { Injectable } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";
import type { FeeConcept, Prisma } from "@prisma/client";
import type { CreateFeeConceptDto, UpdateFeeConceptDto } from "./dto/fee-concept.dto";
import type { AuditService } from "../audit/audit.service";
import { ForbiddenException, NotFoundException } from "@nestjs/common";

@Injectable()
export class FeeConceptsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateFeeConceptDto, user: any, request: any): Promise<FeeConcept> {
    const { propertyId } = dto;

    // Validate property access
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
    });

    if (!property) throw new NotFoundException("Property not found");

    if (user.role !== "SUPERADMIN") {
      if (user.role === "COMPANY_ADMIN" && property.companyId !== user.companyId) {
        throw new ForbiddenException("Access denied to this company");
      }
      if (!["COMPANY_ADMIN"].includes(user.role)) {
        const assignment = await this.prisma.propertyUser.findFirst({
          where: { userId: user.sub, propertyId },
        });
        if (!assignment) throw new ForbiddenException("Not assigned to this property");
      }
    }

    // Prevent duplicate active concepts with same name in same property
    const existing = await this.prisma.feeConcept.findFirst({
      where: { propertyId, name: dto.name, active: true },
    });
    if (existing) throw new ForbiddenException("An active concept with this name already exists");

    const concept = await this.prisma.feeConcept.create({
      data: {
        ...dto,
        propertyId: property.id,
        companyId: property.companyId,
      },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: property.companyId,
      propertyId: property.id,
      entityName: "FeeConcept",
      entityId: concept.id,
      action: "CREATE",
      newValue: concept,
      request,
    });

    return concept;
  }

  async findAll(user: any, propertyId: string): Promise<FeeConcept[]> {
    // Validate property access
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

    return this.prisma.feeConcept.findMany({
      where: { propertyId, deletedAt: null },
    });
  }

  async findOne(
    id: string,
    user: any,
  ): Promise<Prisma.FeeConceptGetPayload<{ include: { property: true } }>> {
    const concept = await this.prisma.feeConcept.findFirst({
      where: { id, deletedAt: null },
      include: { property: true },
    });

    if (!concept) throw new NotFoundException("Concept not found");

    if (user.role !== "SUPERADMIN") {
      const property = concept.property;
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

    return concept;
  }

  async update(id: string, dto: UpdateFeeConceptDto, user: any, request: any): Promise<FeeConcept> {
    const oldConcept = await this.findOne(id, user);

    const updated = await this.prisma.feeConcept.update({
      where: { id },
      data: dto,
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: oldConcept.property.companyId,
      propertyId: oldConcept.propertyId,
      entityName: "FeeConcept",
      entityId: id,
      action: "UPDATE",
      oldValue: oldConcept,
      newValue: updated,
      request,
    });

    return updated;
  }

  async remove(id: string, user: any, request: any): Promise<FeeConcept> {
    const oldConcept = await this.findOne(id, user);

    if (user.role !== "SUPERADMIN" && user.role !== "COMPANY_ADMIN") {
      throw new ForbiddenException("Insufficient permissions");
    }

    const deleted = await this.prisma.feeConcept.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: oldConcept.property.companyId,
      propertyId: oldConcept.propertyId,
      entityName: "FeeConcept",
      entityId: id,
      action: "DELETE",
      oldValue: oldConcept,
      newValue: deleted,
      request,
    });

    return deleted;
  }
}
