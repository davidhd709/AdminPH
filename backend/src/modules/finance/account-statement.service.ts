import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";
import { User, Unit, Fee, Payment, Prisma } from "@prisma/client";

export interface AccountStatement {
  unit: any;
  owner: any;
  summary: {
    totalPending: number;
    totalOverdue: number;
    totalPaid: number;
  };
  pendingFees: any[];
  overdueFees: any[];
  paymentHistory: any[];
}

@Injectable()
export class AccountStatementService {
  constructor(private prisma: PrismaService) {}

  async getStatement(unitId: string, user: any): Promise<AccountStatement> {
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, deletedAt: null },
      include: {
        property: true,
        owners: { where: { deletedAt: null } },
        tower: true,
      },
    });

    if (!unit) throw new NotFoundException("Unit not found");

    // Multi-tenancy check
    if (user.role !== "SUPERADMIN") {
      if (user.role === "COMPANY_ADMIN" && unit.property.companyId !== user.companyId) {
        throw new ForbiddenException("Access denied to this company");
      }
      if (!["COMPANY_ADMIN", "ACCOUNTANT", "PROPERTY_ADMIN"].includes(user.role)) {
        const isOwnerOrResident = await this.prisma.owner.findFirst({
          where: { unitId, userId: user.sub },
        });
        if (!isOwnerOrResident) {
          const resident = await this.prisma.resident.findFirst({
            where: { unitId, userId: user.sub },
          });
          if (!resident)
            throw new ForbiddenException("You can only view statements for your own units");
        }
      }
    }

    const fees = await this.prisma.fee.findMany({
      where: { unitId, deletedAt: null },
      orderBy: { dueDate: "asc" },
      include: { concept: true },
    });

    const payments = await this.prisma.payment.findMany({
      where: { unitId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    let totalPending = 0;
    let totalOverdue = 0;
    let totalPaid = 0;
    const pendingFees = [];
    const overdueFees = [];

    const now = new Date();

    fees.forEach((fee) => {
      const pending = Number(fee.pendingAmount);
      const paid = Number(fee.paidAmount);

      totalPaid += paid;
      totalPending += pending;

      if (pending > 0) {
        pendingFees.push(fee);
        if (new Date(fee.dueDate) < now) {
          totalOverdue += pending;
          overdueFees.push(fee);
        }
      }
    });

    return {
      unit: {
        code: unit.code,
        tower: unit.tower?.name || "N/A",
        property: unit.property.name,
      },
      owner: unit.owners[0]
        ? {
            id: unit.owners[0].id,
            userId: unit.owners[0].userId,
            isPrimary: unit.owners[0].isPrimary,
            status: unit.owners[0].status,
          }
        : null,
      summary: {
        totalPending,
        totalOverdue,
        totalPaid,
      },
      pendingFees,
      overdueFees,
      paymentHistory: payments,
    };
  }

  async validatePazYSalvo(
    unitId: string,
    user: any,
  ): Promise<{
    canGenerate: boolean;
    totalPending: number;
    pendingFees: any[];
    message: string;
  }> {
    const statement = await this.getStatement(unitId, user);

    if (statement.summary.totalPending === 0) {
      return {
        canGenerate: true,
        totalPending: 0,
        pendingFees: [],
        message: "The unit is up to date with all payments.",
      };
    }

    return {
      canGenerate: false,
      totalPending: statement.summary.totalPending,
      pendingFees: statement.pendingFees,
      message: "The unit has outstanding debts.",
    };
  }
}
