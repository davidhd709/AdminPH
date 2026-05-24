import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CommonArea, Reservation, ReservationStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PaginatedResult, PaginationDto } from "../../core/dto/pagination.dto";
import { paginate } from "../../core/utils/paginate";
import { AuthUser } from "../../core/types/auth-user";
import {
  CreateCommonAreaDto,
  CreateReservationDto,
  ReservationQueryDto,
  ReviewReservationDto,
} from "./dto/reservation.dto";

/** Roles con potestad de gestionar zonas comunes y revisar reservas. */
const STAFF_ROLES = ["SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN"];

/** Estados que ocupan el calendario y por tanto cuentan para el overlap. */
const BLOCKING_STATUSES: ReservationStatus[] = ["PENDING", "APPROVED"];

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ===== CommonArea =====

  async createArea(
    dto: CreateCommonAreaDto,
    user: AuthUser,
    request: unknown,
  ): Promise<CommonArea> {
    if (!STAFF_ROLES.includes(user.role)) {
      throw new ForbiddenException("Only staff can create common areas");
    }

    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, deletedAt: null },
    });
    if (!property) throw new NotFoundException("Property not found");

    await this.assertPropertyAccess(user, property.id, property.companyId);

    const area = await this.prisma.commonArea.create({
      data: {
        companyId: property.companyId,
        propertyId: property.id,
        name: dto.name,
        description: dto.description ?? null,
      },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: property.companyId,
      propertyId: property.id,
      entityName: "CommonArea",
      entityId: area.id,
      action: "CREATE",
      newValue: area,
      request,
    });

    return area;
  }

  async listAreas(
    user: AuthUser,
    propertyId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<CommonArea>> {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
    });
    if (!property) throw new NotFoundException("Property not found");

    await this.assertPropertyAccess(user, property.id, property.companyId);

    const where: Record<string, unknown> = {
      propertyId,
      active: true,
      deletedAt: null,
    };

    return paginate<CommonArea>(this.prisma.commonArea, where, pagination, {
      defaultSortBy: "name",
    });
  }

  // ===== Reservation =====

  async createReservation(
    dto: CreateReservationDto,
    user: AuthUser,
    request: unknown,
  ): Promise<Reservation> {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    if (startTime >= endTime) {
      throw new BadRequestException("startTime must be before endTime");
    }

    const commonArea = await this.prisma.commonArea.findFirst({
      where: { id: dto.commonAreaId, deletedAt: null },
    });
    if (!commonArea) throw new NotFoundException("Common area not found");
    if (!commonArea.active) throw new BadRequestException("Common area is not active");

    await this.assertPropertyAccess(user, commonArea.propertyId, commonArea.companyId);

    if (dto.unitId) {
      const unit = await this.prisma.unit.findFirst({
        where: { id: dto.unitId, propertyId: commonArea.propertyId, deletedAt: null },
      });
      if (!unit) throw new NotFoundException("Unit not found in this property");
    }

    await this.assertNoOverlap(commonArea.id, startTime, endTime, BLOCKING_STATUSES);

    const reservation = await this.prisma.reservation.create({
      data: {
        companyId: commonArea.companyId,
        propertyId: commonArea.propertyId,
        commonAreaId: commonArea.id,
        unitId: dto.unitId ?? null,
        requestedById: user.sub,
        startTime,
        endTime,
        status: "PENDING",
        notes: dto.notes ?? null,
      },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: commonArea.companyId,
      propertyId: commonArea.propertyId,
      entityName: "Reservation",
      entityId: reservation.id,
      action: "CREATE",
      newValue: reservation,
      request,
    });

    return reservation;
  }

  async listReservations(
    user: AuthUser,
    query: ReservationQueryDto,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Reservation>> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (query.commonAreaId) where.commonAreaId = query.commonAreaId;
    if (query.status) where.status = query.status;

    if (user.role === "SUPERADMIN") {
      if (query.propertyId) where.propertyId = query.propertyId;
    } else if (user.role === "COMPANY_ADMIN") {
      where.companyId = user.companyId;
      if (query.propertyId) where.propertyId = query.propertyId;
    } else if (STAFF_ROLES.includes(user.role)) {
      // PROPERTY_ADMIN: solo sus propiedades asignadas.
      const assigned = await this.assignedPropertyIds(user.sub);
      where.propertyId = { in: assigned };
    } else {
      // OWNER/RESIDENT/SECURITY: solo las reservas que ellos solicitaron.
      where.requestedById = user.sub;
    }

    return paginate<Reservation>(this.prisma.reservation, where, pagination, {
      defaultSortBy: "startTime",
    });
  }

  async review(
    id: string,
    dto: ReviewReservationDto,
    user: AuthUser,
    request: unknown,
  ): Promise<Reservation> {
    if (!STAFF_ROLES.includes(user.role)) {
      throw new ForbiddenException("Only staff can review reservations");
    }

    const reservation = await this.prisma.reservation.findFirst({
      where: { id, deletedAt: null },
    });
    if (!reservation) throw new NotFoundException("Reservation not found");

    await this.assertPropertyAccess(user, reservation.propertyId, reservation.companyId);

    if (reservation.status !== "PENDING") {
      throw new BadRequestException("Only pending reservations can be reviewed");
    }

    if (dto.status === "APPROVED") {
      // Re-chequear contra OTRAS aprobadas, por si se aprobaron otras mientras
      // esta estaba pendiente.
      await this.assertNoOverlap(
        reservation.commonAreaId,
        reservation.startTime,
        reservation.endTime,
        [ReservationStatus.APPROVED],
        reservation.id,
      );
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: dto.status,
        reviewedById: user.sub,
        reviewedAt: new Date(),
      },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: reservation.companyId,
      propertyId: reservation.propertyId,
      entityName: "Reservation",
      entityId: id,
      action: dto.status === "APPROVED" ? "APPROVE" : "REJECT",
      oldValue: { status: reservation.status },
      newValue: { status: updated.status },
      request,
    });

    return updated;
  }

  async cancel(id: string, user: AuthUser, request: unknown): Promise<Reservation> {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id, deletedAt: null },
    });
    if (!reservation) throw new NotFoundException("Reservation not found");

    const isStaff = STAFF_ROLES.includes(user.role);
    const isAuthor = reservation.requestedById === user.sub;
    if (!isStaff && !isAuthor) {
      throw new ForbiddenException("Only the author or staff can cancel this reservation");
    }
    if (isStaff) {
      await this.assertPropertyAccess(user, reservation.propertyId, reservation.companyId);
    }

    if (reservation.status !== "PENDING" && reservation.status !== "APPROVED") {
      throw new BadRequestException("Only pending or approved reservations can be cancelled");
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: reservation.companyId,
      propertyId: reservation.propertyId,
      entityName: "Reservation",
      entityId: id,
      action: "UPDATE",
      oldValue: { status: reservation.status },
      newValue: { status: updated.status },
      request,
    });

    return updated;
  }

  // ===== Helpers =====

  /**
   * Rechaza con ConflictException si existe otra reserva en la misma zona común
   * cuyo rango [startTime, endTime) se solapa con el solicitado. Solapan si
   * `existing.startTime < new.endTime && existing.endTime > new.startTime`.
   */
  private async assertNoOverlap(
    commonAreaId: string,
    startTime: Date,
    endTime: Date,
    statuses: ReservationStatus[],
    excludeId?: string,
  ): Promise<void> {
    const overlap = await this.prisma.reservation.findFirst({
      where: {
        commonAreaId,
        deletedAt: null,
        status: { in: statuses },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (overlap) {
      throw new ConflictException("Time range overlaps an existing reservation");
    }
  }

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
}
