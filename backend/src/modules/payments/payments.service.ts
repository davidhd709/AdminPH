import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Payment } from "@prisma/client";
import { CreatePaymentDto, ApprovePaymentDto, RejectPaymentDto } from "./dto/payment.dto";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async createPayment(dto: CreatePaymentDto, user: any, request: any): Promise<Payment> {
    const unit = await this.prisma.unit.findFirst({
      where: { id: dto.unitId, deletedAt: null },
      include: { property: true },
    });

    if (!unit) throw new NotFoundException("Unit not found");

    // Multi-tenancy & Ownership check
    if (user.role !== "SUPERADMIN") {
      if (user.role === "COMPANY_ADMIN" && unit.property.companyId !== user.companyId) {
        throw new ForbiddenException("Access denied");
      }
      if (!["COMPANY_ADMIN", "ACCOUNTANT", "PROPERTY_ADMIN"].includes(user.role)) {
        // Check if user is owner or resident of this unit
        const person = await this.prisma.owner.findFirst({
          where: { unitId: dto.unitId, userId: user.sub, deletedAt: null },
        });
        if (!person) {
          const resident = await this.prisma.resident.findFirst({
            where: { unitId: dto.unitId, userId: user.sub, deletedAt: null },
          });
          if (!resident)
            throw new ForbiddenException("You can only create payments for your own units");
        }
      }
    }

    // Prevent duplicate bank references in the same property (entre pagos activos).
    // Si un pago previo con esa referencia fue soft-deleted, no se cuenta.
    const duplicate = await this.prisma.payment.findFirst({
      where: {
        propertyId: unit.propertyId,
        bankReference: dto.bankReference,
        status: { not: "REJECTED" },
        deletedAt: null,
      },
    });
    if (duplicate)
      throw new BadRequestException(
        "This bank reference has already been used for a payment in this property",
      );

    const payment = await this.prisma.payment.create({
      data: {
        ...dto,
        userId: user.sub,
        propertyId: unit.propertyId,
        companyId: unit.property.companyId,
        status: "PENDING_REVIEW",
      },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: unit.property.companyId,
      propertyId: unit.propertyId,
      entityName: "Payment",
      entityId: payment.id,
      action: "CREATE",
      newValue: payment,
      request,
    });

    return payment;
  }

  async approvePayment(
    dto: ApprovePaymentDto,
    user: any,
    request: any,
  ): Promise<{ payment: Payment; allocations: any[] }> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: dto.paymentId, deletedAt: null },
      include: { unit: { include: { property: true } } },
    });

    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status !== "PENDING_REVIEW")
      throw new BadRequestException("Payment is not in review status");

    // Role check
    if (
      user.role !== "SUPERADMIN" &&
      !["COMPANY_ADMIN", "PROPERTY_ADMIN", "ACCOUNTANT"].includes(user.role)
    ) {
      throw new ForbiddenException("Insufficient permissions to approve payments");
    }

    // Tenancy check
    if (user.role !== "SUPERADMIN" && payment.companyId !== user.companyId) {
      throw new ForbiddenException("Access denied to this company");
    }

    return this.allocateAndApprove(payment, user.sub);
  }

  /**
   * Aprobación automática vía pasarela de pagos (webhook). El sistema confirma
   * el pago sin intervención de un usuario administrador. La auditoría se
   * atribuye a quien subió el pago (payment.userId) con reviewedBy="GATEWAY".
   *
   * @see PaymentGatewayService y el webhook en payments.controller.
   */
  async approveViaGateway(
    paymentId: string,
  ): Promise<{ payment: Payment; allocations: { feeId: string; amount: number }[] }> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, deletedAt: null },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status !== "PENDING_REVIEW") {
      throw new BadRequestException("Payment is not in review status");
    }
    return this.allocateAndApprove(payment, payment.userId, "GATEWAY");
  }

  /**
   * Lógica transaccional compartida de aprobación: asigna el monto del pago a
   * las cuotas pendientes más antiguas primero (oldest-first), actualiza
   * estados de las cuotas y del pago, y registra auditoría. Idéntica para
   * aprobación manual (admin) y automática (gateway).
   */
  private allocateAndApprove(
    payment: Payment,
    auditUserId: string,
    reviewedBy = "MANUAL",
  ): Promise<{ payment: Payment; allocations: { feeId: string; amount: number }[] }> {
    return this.prisma.$transaction(async (tx) => {
      let remaining = Number(payment.amount);
      const allocations: { feeId: string; amount: number }[] = [];

      const pendingFees = await tx.fee.findMany({
        where: {
          unitId: payment.unitId,
          status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
          deletedAt: null,
        },
        orderBy: { dueDate: "asc" },
      });

      for (const fee of pendingFees) {
        if (remaining <= 0) break;

        const feePending = Number(fee.pendingAmount);
        const allocationAmount = Math.min(remaining, feePending);

        if (allocationAmount > 0) {
          await tx.paymentAllocation.create({
            data: { paymentId: payment.id, feeId: fee.id, amountAllocated: allocationAmount },
          });

          const newPaidAmount = Number(fee.paidAmount) + allocationAmount;
          const newPendingAmount = feePending - allocationAmount;
          let newStatus = fee.status;
          if (newPendingAmount === 0) newStatus = "PAID";
          else if (newPaidAmount > 0) newStatus = "PARTIAL";

          await tx.fee.update({
            where: { id: fee.id },
            data: {
              paidAmount: newPaidAmount,
              pendingAmount: newPendingAmount,
              status: newStatus,
            },
          });

          allocations.push({ feeId: fee.id, amount: allocationAmount });
          remaining -= allocationAmount;
        }
      }

      const finalStatus = remaining === 0 ? "APPROVED" : "PARTIAL";
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { status: finalStatus, reviewedBy, reviewedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          userId: auditUserId,
          companyId: payment.companyId,
          propertyId: payment.propertyId,
          entityName: "Payment",
          entityId: payment.id,
          action: "APPROVE",
          oldValue: payment,
          newValue: updatedPayment,
        },
      });

      return { payment: updatedPayment, allocations };
    });
  }

  async rejectPayment(dto: RejectPaymentDto, user: any, request: any): Promise<Payment> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: dto.paymentId, deletedAt: null },
    });

    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status !== "PENDING_REVIEW")
      throw new BadRequestException("Payment is not in review status");

    if (
      user.role !== "SUPERADMIN" &&
      !["COMPANY_ADMIN", "PROPERTY_ADMIN", "ACCOUNTANT"].includes(user.role)
    ) {
      throw new ForbiddenException("Insufficient permissions to reject payments");
    }

    const rejected = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "REJECTED",
        rejectionReason: dto.rejectionReason,
        reviewedBy: user.sub,
        reviewedAt: new Date(),
      },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: payment.companyId,
      propertyId: payment.propertyId,
      entityName: "Payment",
      entityId: payment.id,
      action: "REJECT",
      oldValue: payment,
      newValue: rejected,
      request,
    });

    return rejected;
  }
}
