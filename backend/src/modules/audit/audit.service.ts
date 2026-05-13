import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditAction } from "@prisma/client";

export interface AuditLogParams {
  userId: string;
  companyId?: string;
  propertyId?: string;
  entityName: string;
  entityId: string;
  action: AuditAction;
  oldValue?: any;
  newValue?: any;
  request?: any;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        companyId: params.companyId,
        propertyId: params.propertyId,
        entityName: params.entityName,
        entityId: params.entityId,
        action: params.action,
        oldValue: params.oldValue,
        newValue: params.newValue,
      },
    });
  }
}
