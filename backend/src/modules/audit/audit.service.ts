import { Injectable } from "@nestjs/common";
import { Request } from "express";
import { AuditAction } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditLogParams {
  userId: string;
  companyId?: string | null;
  propertyId?: string | null;
  unitId?: string | null;
  entityName: string;
  entityId: string;
  action: AuditAction;
  // oldValue/newValue son JSON dinámico; Prisma los tipa como InputJsonValue
  // y este service solo los pasa de largo.
  oldValue?: any;
  newValue?: any;
  request?: Request | unknown;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    const { ipAddress, userAgent, requestId } = this.extractRequestContext(params.request);

    await this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        companyId: params.companyId ?? undefined,
        propertyId: params.propertyId ?? undefined,
        unitId: params.unitId ?? undefined,
        entityName: params.entityName,
        entityId: params.entityId,
        action: params.action,
        oldValue: params.oldValue,
        newValue: params.newValue,
        ipAddress,
        userAgent,
        requestId,
      },
    });
  }

  private extractRequestContext(request: Request | unknown): {
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  } {
    if (!request || typeof request !== "object") return {};
    const req = request as Partial<Request> & {
      headers?: Record<string, string | string[] | undefined>;
    };

    const headers = req.headers ?? {};
    const xff = headers["x-forwarded-for"];
    const forwarded = Array.isArray(xff) ? xff[0] : xff;
    const ipAddress = (forwarded?.split(",")[0]?.trim() || req.ip) ?? undefined;

    const ua = headers["user-agent"];
    const userAgent = Array.isArray(ua) ? ua[0] : ua;

    const rid = headers["x-request-id"];
    const requestId = Array.isArray(rid) ? rid[0] : rid;

    return { ipAddress, userAgent, requestId };
  }
}
