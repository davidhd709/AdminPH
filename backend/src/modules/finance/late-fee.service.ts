import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LateFeeConfig } from "@prisma/client";
import { CreateLateFeeConfigDto } from "./dto/late-fee.dto";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class LateFeeService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async createConfig(dto: CreateLateFeeConfigDto, user: any, request: any): Promise<LateFeeConfig> {
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

    const config = await this.prisma.lateFeeConfig.upsert({
      where: { propertyId: dto.propertyId },
      update: dto,
      create: {
        ...dto,
        companyId: property.companyId,
      },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: property.companyId,
      propertyId: property.id,
      entityName: "LateFeeConfig",
      entityId: config.id,
      action: "UPDATE",
      newValue: config,
      request,
    });

    return config;
  }

  async getConfig(propertyId: string, user: any): Promise<LateFeeConfig | null> {
    const config = await this.prisma.lateFeeConfig.findFirst({
      where: { propertyId, deletedAt: null },
    });

    if (!config) return null;

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

    return config;
  }

  async calculateAndGenerateInterest(
    propertyId: string,
    user: any,
    request: any,
  ): Promise<{
    processedFees: number;
    createdInterestFees: number;
    totalInterest: number;
  }> {
    const config = await this.getConfig(propertyId, user);
    if (!config || !config.active) {
      throw new ForbiddenException("Late fee configuration is not active for this property");
    }

    const overdueFees = await this.prisma.fee.findMany({
      where: {
        propertyId,
        status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
        deletedAt: null,
      },
    });

    let createdInterestFees = 0;
    let totalInterest = 0;
    const now = new Date();

    for (const fee of overdueFees) {
      const dueDate = new Date(fee.dueDate);
      const graceDate = new Date(dueDate);
      graceDate.setDate(graceDate.getDate() + config.graceDays);

      if (now < graceDate) continue;

      // Calculate days/months late
      const diffTime = Math.abs(now.getTime() - dueDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let interestAmount = 0;
      const pending = Number(fee.pendingAmount);

      if (config.interestType === "DAILY") {
        interestAmount = pending * (Number(config.interestRate) / 100) * diffDays;
      } else {
        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths > 0) {
          interestAmount = pending * (Number(config.interestRate) / 100) * diffMonths;
        }
      }

      if (interestAmount > 0) {
        // Avoid duplicate interest for same fee and current month
        const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        // Dynamic lookup of the INTEREST concept for this property
        const interestConcept = await this.prisma.feeConcept.findFirst({
          where: {
            propertyId: propertyId,
            name: { contains: "INTEREST", mode: "insensitive" },
            active: true,
            deletedAt: null,
          },
        });

        if (!interestConcept) {
          throw new NotFoundException("Interest fee concept not configured for this property");
        }

        const existingInterest = await this.prisma.fee.findFirst({
          where: {
            unitId: fee.unitId,
            conceptId: interestConcept.id,
            period: currentPeriod,
            deletedAt: null,
          },
        });

        if (!existingInterest) {
          await this.prisma.fee.create({
            data: {
              companyId: fee.companyId,
              propertyId: fee.propertyId,
              unitId: fee.unitId,
              conceptId: interestConcept.id,
              amount: interestAmount,
              pendingAmount: interestAmount,
              paidAmount: 0,
              dueDate: now,
              period: currentPeriod,
              status: "PENDING",
            },
          });
          createdInterestFees++;
          totalInterest += interestAmount;
        }
      }
    }

    const propertyForAudit = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
      select: { companyId: true },
    });
    await this.auditService.log({
      userId: user.sub,
      companyId: propertyForAudit?.companyId,
      propertyId,
      entityName: "LateFeeCalculation",
      entityId: "SYSTEM",
      action: "CREATE",
      newValue: { createdInterestFees, totalInterest },
      request,
    });

    return {
      processedFees: overdueFees.length,
      createdInterestFees,
      totalInterest,
    };
  }
}
