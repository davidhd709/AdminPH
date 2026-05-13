import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditAction } from "@prisma/client";

export interface AuditLogParams {
  userId: string;
  companyId?: string | null;
  propertyId?: string | null;
  entityName: string;
  entityId: string;
  action: AuditAction;
  // oldValue/newValue son JSON dinámico; Prisma los tipa como InputJsonValue
  // y este service solo los pasa de largo.
  oldValue?: any;
  newValue?: any;
  request?: unknown;
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
