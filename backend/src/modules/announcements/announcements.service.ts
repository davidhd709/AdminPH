import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Announcement } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PaginatedResult, PaginationDto } from "../../core/dto/pagination.dto";
import { paginate } from "../../core/utils/paginate";
import { AuthUser } from "../../core/types/auth-user";
import { AnnouncementQueryDto, CreateAnnouncementDto } from "./dto/announcement.dto";

/** Roles con potestad de publicar comunicados. */
const STAFF_ROLES = ["SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN"];

@Injectable()
export class AnnouncementsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(
    dto: CreateAnnouncementDto,
    user: AuthUser,
    request: unknown,
  ): Promise<Announcement> {
    if (!STAFF_ROLES.includes(user.role)) {
      throw new ForbiddenException("Only staff can publish announcements");
    }

    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, deletedAt: null },
    });
    if (!property) throw new NotFoundException("Property not found");

    await this.assertPropertyAccess(user, property.id, property.companyId);

    if (dto.scope === "TOWER") {
      if (!dto.towerId) throw new BadRequestException("towerId is required when scope is TOWER");
      const tower = await this.prisma.tower.findFirst({
        where: { id: dto.towerId, propertyId: property.id, deletedAt: null },
      });
      if (!tower) throw new NotFoundException("Tower not found in this property");
    }

    if (dto.scope === "UNIT") {
      if (!dto.unitId) throw new BadRequestException("unitId is required when scope is UNIT");
      const unit = await this.prisma.unit.findFirst({
        where: { id: dto.unitId, propertyId: property.id, deletedAt: null },
      });
      if (!unit) throw new NotFoundException("Unit not found in this property");
    }

    const announcement = await this.prisma.announcement.create({
      data: {
        companyId: property.companyId,
        propertyId: property.id,
        towerId: dto.scope === "TOWER" ? dto.towerId : null,
        unitId: dto.scope === "UNIT" ? dto.unitId : null,
        createdById: user.sub,
        scope: dto.scope,
        title: dto.title,
        body: dto.body,
      },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: property.companyId,
      propertyId: property.id,
      entityName: "Announcement",
      entityId: announcement.id,
      action: "CREATE",
      newValue: announcement,
      request,
    });

    return announcement;
  }

  async findAll(
    user: AuthUser,
    query: AnnouncementQueryDto,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Announcement>> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (user.role === "SUPERADMIN") {
      if (query.propertyId) where.propertyId = query.propertyId;
    } else if (user.role === "COMPANY_ADMIN") {
      where.companyId = user.companyId;
      if (query.propertyId) where.propertyId = query.propertyId;
    } else if (STAFF_ROLES.includes(user.role)) {
      // PROPERTY_ADMIN: solo sus propiedades asignadas.
      const assigned = await this.assignedPropertyIds(user.sub);
      where.propertyId = { in: assigned };
      if (query.propertyId) where.propertyId = query.propertyId;
    } else {
      // OWNER/RESIDENT/SECURITY: comunicados de las propiedades donde tienen
      // asignación; si no tienen ninguna, caen al companyId del usuario.
      // Simplificación segura: nunca ven nada fuera de su empresa.
      const assigned = await this.assignedPropertyIds(user.sub);
      if (assigned.length > 0) {
        where.propertyId = { in: assigned };
      } else {
        where.companyId = user.companyId;
      }
      if (query.propertyId && assigned.includes(query.propertyId)) {
        where.propertyId = query.propertyId;
      }
    }

    return paginate<Announcement>(this.prisma.announcement, where, pagination, {
      defaultSortBy: "publishedAt",
    });
  }

  async findOne(id: string, user: AuthUser): Promise<Announcement> {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, deletedAt: null },
    });
    if (!announcement) throw new NotFoundException("Announcement not found");

    await this.assertReadAccess(user, announcement);
    return announcement;
  }

  async markAsRead(id: string, user: AuthUser): Promise<{ readAt: Date }> {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, deletedAt: null },
    });
    if (!announcement) throw new NotFoundException("Announcement not found");

    await this.assertReadAccess(user, announcement);

    const read = await this.prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId: id, userId: user.sub } },
      create: { announcementId: id, userId: user.sub },
      update: {},
    });

    return { readAt: read.readAt };
  }

  // ===== Helpers de acceso =====

  private async assignedPropertyIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.propertyUser.findMany({
      where: { userId },
      select: { propertyId: true },
    });
    return rows.map((r) => r.propertyId);
  }

  private async assertPropertyAccess(
    user: AuthUser,
    propertyId: string,
    companyId: string,
  ): Promise<void> {
    if (user.role === "SUPERADMIN") return;
    if (user.role === "COMPANY_ADMIN") {
      if (companyId !== user.companyId) throw new ForbiddenException("Cross-company access denied");
      return;
    }
    const assignment = await this.prisma.propertyUser.findFirst({
      where: { userId: user.sub, propertyId },
    });
    if (!assignment) throw new ForbiddenException("Not assigned to this property");
  }

  private async assertReadAccess(user: AuthUser, announcement: Announcement): Promise<void> {
    if (user.role === "SUPERADMIN") return;
    if (user.role === "COMPANY_ADMIN") {
      if (announcement.companyId !== user.companyId) throw new ForbiddenException("Access denied");
      return;
    }
    if (STAFF_ROLES.includes(user.role)) {
      await this.assertPropertyAccess(user, announcement.propertyId, announcement.companyId);
      return;
    }
    // OWNER/RESIDENT/SECURITY: pueden leer si están asignados a la propiedad o,
    // en su defecto, si el comunicado pertenece a su empresa.
    const assigned = await this.assignedPropertyIds(user.sub);
    if (assigned.includes(announcement.propertyId)) return;
    if (user.companyId && announcement.companyId === user.companyId) return;
    throw new ForbiddenException("Access denied to this announcement");
  }
}
