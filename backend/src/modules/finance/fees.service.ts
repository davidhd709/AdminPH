import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Fee } from "@prisma/client";
import { GenerateFeesDto, FeeQueryDto } from "./dto/fees.dto";
import { AuditService } from "../audit/audit.service";
import { PaginatedResult, PaginationDto } from "../../core/dto/pagination.dto";
import { paginate } from "../../core/utils/paginate";

export interface GenerationSummary {
  totalUnits: number;
  createdFees: number;
  skippedFees: number;
  totalAmount: number;
  errors: string[];
}

@Injectable()
export class FeesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async generateMassFees(
    dto: GenerateFeesDto,
    user: any,
    request: any,
  ): Promise<GenerationSummary> {
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, deletedAt: null },
    });

    if (!property) throw new NotFoundException("Property not found");

    // Multi-tenancy check
    if (user.role !== "SUPERADMIN") {
      if (user.role === "COMPANY_ADMIN" && property.companyId !== user.companyId) {
        throw new ForbiddenException("Access denied to this company");
      }
      if (!["COMPANY_ADMIN"].includes(user.role)) {
        const assignment = await this.prisma.propertyUser.findFirst({
          where: { userId: user.sub, propertyId: dto.propertyId },
        });
        if (!assignment) throw new ForbiddenException("Not assigned to this property");
      }
    }

    const concept = await this.prisma.feeConcept.findFirst({
      where: { id: dto.conceptId, deletedAt: null },
    });

    if (!concept) throw new NotFoundException("Fee concept not found");

    const units = await this.prisma.unit.findMany({
      where: { propertyId: dto.propertyId, deletedAt: null },
    });

    const summary: GenerationSummary = {
      totalUnits: units.length,
      createdFees: 0,
      skippedFees: 0,
      totalAmount: 0,
      errors: [],
    };

    for (const unit of units) {
      try {
        // Avoid duplicates for same unit, concept, and period
        const existingFee = await this.prisma.fee.findFirst({
          where: {
            unitId: unit.id,
            conceptId: dto.conceptId,
            period: dto.period,
            deletedAt: null,
          },
        });

        if (existingFee) {
          summary.skippedFees++;
          continue;
        }

        // Calculate amount
        let amount = 0;
        if (concept.calculationType === "FIXED") {
          amount = dto.baseAmount || Number(concept.defaultAmount);
        } else {
          if (!dto.baseAmount)
            throw new Error("baseAmount is required for coefficient calculation");
          amount = dto.baseAmount * Number(unit.coefficient);
        }

        if (amount <= 0) {
          summary.errors.push(`Unit ${unit.code}: Amount must be greater than 0`);
          summary.skippedFees++;
          continue;
        }

        await this.prisma.fee.create({
          data: {
            unitId: unit.id,
            propertyId: property.id,
            companyId: property.companyId,
            conceptId: dto.conceptId,
            amount: amount,
            pendingAmount: amount,
            paidAmount: 0,
            dueDate: dto.dueDate,
            period: dto.period,
            status: "PENDING",
          },
        });

        summary.createdFees++;
        summary.totalAmount += Number(amount);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        summary.errors.push(`Unit ${unit.code}: ${msg}`);
        summary.skippedFees++;
      }
    }

    await this.auditService.log({
      userId: user.sub,
      companyId: property.companyId,
      propertyId: property.id,
      entityName: "Fee",
      entityId: "MASS_GENERATION",
      action: "CREATE",
      newValue: summary,
      request,
    });

    return summary;
  }

  async findAll(
    user: any,
    query: FeeQueryDto,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Fee>> {
    const where: any = { deletedAt: null };

    if (query.unitId) where.unitId = query.unitId;
    if (query.period) where.period = query.period;
    if (query.status) where.status = query.status;

    // Multi-tenancy: If not superadmin, we must filter by their assigned properties
    if (user.role !== "SUPERADMIN") {
      const propertyUsers = await this.prisma.propertyUser.findMany({
        where: { userId: user.sub },
        select: { propertyId: true },
      });
      where.propertyId = { in: propertyUsers.map((pu) => pu.propertyId) };
    }

    return paginate<Fee>(this.prisma.fee, where, pagination, {
      include: { unit: true, concept: true },
      defaultSortBy: "dueDate",
    });
  }

  async findOne(id: string, user: any): Promise<Fee> {
    const fee = await this.prisma.fee.findFirst({
      where: { id, deletedAt: null },
      include: { property: true, unit: true },
    });

    if (!fee) throw new NotFoundException("Fee not found");

    if (user.role !== "SUPERADMIN") {
      if (user.role === "COMPANY_ADMIN" && fee.companyId !== user.companyId) {
        throw new ForbiddenException("Access denied");
      }
      if (!["COMPANY_ADMIN"].includes(user.role)) {
        const assignment = await this.prisma.propertyUser.findFirst({
          where: { userId: user.sub, propertyId: fee.propertyId },
        });
        if (!assignment) throw new ForbiddenException("Not assigned to this property");
      }
    }

    return fee;
  }

  async cancelFee(id: string, user: any, request: any): Promise<Fee> {
    const fee = await this.findOne(id, user);

    if (fee.status === "PAID") {
      throw new ForbiddenException("Cannot cancel a fully paid fee");
    }

    const updated = await this.prisma.fee.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: fee.companyId,
      propertyId: fee.propertyId,
      entityName: "Fee",
      entityId: id,
      action: "UPDATE",
      oldValue: fee,
      newValue: updated,
      request,
    });

    return updated;
  }
}
