import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pet, Vehicle } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PaginatedResult, PaginationDto } from "../../core/dto/pagination.dto";
import { paginate } from "../../core/utils/paginate";
import { AuthUser } from "../../core/types/auth-user";
import { CreatePetDto, CreateVehicleDto, RegistryQueryDto } from "./dto/registry.dto";

/** Unidad con su property, lo mínimo para derivar company/property y scoping. */
type UnitWithProperty = {
  id: string;
  propertyId: string;
  property: { id: string; companyId: string };
};

@Injectable()
export class RegistryService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ===== Pet =====

  async createPet(dto: CreatePetDto, user: AuthUser, request: unknown): Promise<Pet> {
    const unit = await this.assertUnitAccess(user, dto.unitId);

    const pet = await this.prisma.pet.create({
      data: {
        companyId: unit.property.companyId,
        propertyId: unit.propertyId,
        unitId: unit.id,
        name: dto.name,
        species: dto.species,
        breed: dto.breed ?? null,
        notes: dto.notes ?? null,
      },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: unit.property.companyId,
      propertyId: unit.propertyId,
      unitId: unit.id,
      entityName: "Pet",
      entityId: pet.id,
      action: "CREATE",
      newValue: pet,
      request,
    });

    return pet;
  }

  async listPets(
    user: AuthUser,
    query: RegistryQueryDto,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Pet>> {
    const where = await this.buildScopedWhere(user, query);
    return paginate<Pet>(this.prisma.pet, where, pagination, {
      defaultSortBy: "createdAt",
    });
  }

  async removePet(id: string, user: AuthUser, request: unknown): Promise<Pet> {
    const pet = await this.prisma.pet.findFirst({ where: { id, deletedAt: null } });
    if (!pet) throw new NotFoundException("Pet not found");

    await this.assertUnitAccess(user, pet.unitId);

    const updated = await this.prisma.pet.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: pet.companyId,
      propertyId: pet.propertyId,
      unitId: pet.unitId,
      entityName: "Pet",
      entityId: id,
      action: "DELETE",
      oldValue: { deletedAt: pet.deletedAt },
      newValue: { deletedAt: updated.deletedAt },
      request,
    });

    return updated;
  }

  // ===== Vehicle =====

  async createVehicle(dto: CreateVehicleDto, user: AuthUser, request: unknown): Promise<Vehicle> {
    const unit = await this.assertUnitAccess(user, dto.unitId);

    const existing = await this.prisma.vehicle.findFirst({
      where: { propertyId: unit.propertyId, plate: dto.plate, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException("A vehicle with this plate already exists in this property");
    }

    const vehicle = await this.prisma.vehicle.create({
      data: {
        companyId: unit.property.companyId,
        propertyId: unit.propertyId,
        unitId: unit.id,
        plate: dto.plate,
        type: dto.type ?? "CAR",
        brand: dto.brand ?? null,
        color: dto.color ?? null,
        parkingSpot: dto.parkingSpot ?? null,
      },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: unit.property.companyId,
      propertyId: unit.propertyId,
      unitId: unit.id,
      entityName: "Vehicle",
      entityId: vehicle.id,
      action: "CREATE",
      newValue: vehicle,
      request,
    });

    return vehicle;
  }

  async listVehicles(
    user: AuthUser,
    query: RegistryQueryDto,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Vehicle>> {
    const where = await this.buildScopedWhere(user, query);
    return paginate<Vehicle>(this.prisma.vehicle, where, pagination, {
      defaultSortBy: "createdAt",
    });
  }

  async removeVehicle(id: string, user: AuthUser, request: unknown): Promise<Vehicle> {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
    if (!vehicle) throw new NotFoundException("Vehicle not found");

    await this.assertUnitAccess(user, vehicle.unitId);

    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: vehicle.companyId,
      propertyId: vehicle.propertyId,
      unitId: vehicle.unitId,
      entityName: "Vehicle",
      entityId: id,
      action: "DELETE",
      oldValue: { deletedAt: vehicle.deletedAt },
      newValue: { deletedAt: updated.deletedAt },
      request,
    });

    return updated;
  }

  // ===== Helpers de acceso =====

  /**
   * Carga la unit (con su property) y valida que `user` pueda gestionarla.
   * Reglas:
   * - SUPERADMIN: siempre.
   * - COMPANY_ADMIN: si la company de la property coincide con la suya.
   * - PROPERTY_ADMIN: si tiene un PropertyUser de esa property.
   * - OWNER/RESIDENT: si existe un Owner o Resident activo (deletedAt null) de
   *   esa unit con userId = user.sub.
   * Cualquier otro caso -> ForbiddenException.
   * Retorna la unit con companyId/propertyId para derivar el registro.
   */
  private async assertUnitAccess(user: AuthUser, unitId: string): Promise<UnitWithProperty> {
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, deletedAt: null },
      include: { property: { select: { id: true, companyId: true } } },
    });
    if (!unit) throw new NotFoundException("Unit not found");

    if (user.role === "SUPERADMIN") return unit as UnitWithProperty;

    if (user.role === "COMPANY_ADMIN") {
      if (unit.property.companyId !== user.companyId) {
        throw new ForbiddenException("Cross-company access denied");
      }
      return unit as UnitWithProperty;
    }

    if (user.role === "PROPERTY_ADMIN") {
      const assignment = await this.prisma.propertyUser.findFirst({
        where: { userId: user.sub, propertyId: unit.propertyId },
      });
      if (!assignment) throw new ForbiddenException("Not assigned to this property");
      return unit as UnitWithProperty;
    }

    // OWNER / RESIDENT: deben ser owner o resident vinculado a la unidad.
    const [owner, resident] = await Promise.all([
      this.prisma.owner.findFirst({
        where: { unitId, userId: user.sub, deletedAt: null },
      }),
      this.prisma.resident.findFirst({
        where: { unitId, userId: user.sub, deletedAt: null },
      }),
    ]);
    if (!owner && !resident) {
      throw new ForbiddenException("Not an owner or resident of this unit");
    }

    return unit as UnitWithProperty;
  }

  private async assignedPropertyIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.propertyUser.findMany({
      where: { userId },
      select: { propertyId: true },
    });
    return rows.map((r) => r.propertyId);
  }

  /** unitIds donde el user es owner o resident activo. */
  private async accessibleUnitIds(userId: string): Promise<string[]> {
    const [owners, residents] = await Promise.all([
      this.prisma.owner.findMany({
        where: { userId, deletedAt: null },
        select: { unitId: true },
      }),
      this.prisma.resident.findMany({
        where: { userId, deletedAt: null },
        select: { unitId: true },
      }),
    ]);
    const ids = new Set<string>();
    owners.forEach((o) => ids.add(o.unitId));
    residents.forEach((r) => ids.add(r.unitId));
    return [...ids];
  }

  /**
   * Arma el `where` (deletedAt null) con el scoping de lectura según el rol.
   * - SUPERADMIN: todo (filtros opcionales).
   * - COMPANY_ADMIN: su companyId.
   * - PROPERTY_ADMIN: sus properties asignadas.
   * - OWNER/RESIDENT: solo las unidades donde son owner/resident. Si pasan
   *   query.unitId, se intersecta con ese acceso.
   */
  private async buildScopedWhere(
    user: AuthUser,
    query: RegistryQueryDto,
  ): Promise<Record<string, unknown>> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (user.role === "SUPERADMIN") {
      if (query.propertyId) where.propertyId = query.propertyId;
      if (query.unitId) where.unitId = query.unitId;
    } else if (user.role === "COMPANY_ADMIN") {
      where.companyId = user.companyId;
      if (query.propertyId) where.propertyId = query.propertyId;
      if (query.unitId) where.unitId = query.unitId;
    } else if (user.role === "PROPERTY_ADMIN") {
      const assigned = await this.assignedPropertyIds(user.sub);
      where.propertyId = { in: assigned };
      if (query.propertyId && assigned.includes(query.propertyId)) {
        where.propertyId = query.propertyId;
      }
      if (query.unitId) where.unitId = query.unitId;
    } else {
      // OWNER/RESIDENT: solo las unidades a las que están vinculados.
      const unitIds = await this.accessibleUnitIds(user.sub);
      const scoped = query.unitId ? unitIds.filter((id) => id === query.unitId) : unitIds;
      where.unitId = { in: scoped };
    }

    return where;
  }
}
