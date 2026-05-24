import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Assembly, AssemblyAttendance, Vote, VoteChoice, Voting } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PaginatedResult, PaginationDto } from "../../core/dto/pagination.dto";
import { paginate } from "../../core/utils/paginate";
import { AuthUser } from "../../core/types/auth-user";
import {
  AssemblyQueryDto,
  CastVoteDto,
  CreateAssemblyDto,
  CreateVotingDto,
  RegisterAttendanceDto,
  UpdateAssemblyStatusDto,
} from "./dto/assembly.dto";

/** Roles con potestad de gestionar asambleas, asistencia y votaciones. */
const STAFF_ROLES = ["SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN"];

/** Resultado del escrutinio de una votación. */
export interface VotingTally {
  votingId: string;
  type: Voting["type"];
  status: Voting["status"];
  byCount: Record<VoteChoice, number>;
  byCoefficient: Record<VoteChoice, number>;
  totals: { totalVotes: number; totalCoefficient: number };
}

@Injectable()
export class AssembliesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ===== Assembly =====

  async createAssembly(
    dto: CreateAssemblyDto,
    user: AuthUser,
    request: unknown,
  ): Promise<Assembly> {
    if (!STAFF_ROLES.includes(user.role)) {
      throw new ForbiddenException("Only staff can create assemblies");
    }

    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, deletedAt: null },
    });
    if (!property) throw new NotFoundException("Property not found");

    await this.assertPropertyAccess(user, property.id, property.companyId);

    const assembly = await this.prisma.assembly.create({
      data: {
        companyId: property.companyId,
        propertyId: property.id,
        createdById: user.sub,
        title: dto.title,
        type: dto.type ?? "ORDINARY",
        agenda: dto.agenda ?? null,
        scheduledAt: new Date(dto.scheduledAt),
        quorumPercent: dto.quorumPercent ?? null,
      },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: property.companyId,
      propertyId: property.id,
      entityName: "Assembly",
      entityId: assembly.id,
      action: "CREATE",
      newValue: assembly,
      request,
    });

    return assembly;
  }

  async listAssemblies(
    user: AuthUser,
    query: AssemblyQueryDto,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Assembly>> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;

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
      // OWNER/RESIDENT: solo asambleas de sus propiedades asignadas.
      const assigned = await this.assignedPropertyIds(user.sub);
      where.propertyId = { in: assigned };
    }

    return paginate<Assembly>(this.prisma.assembly, where, pagination, {
      defaultSortBy: "scheduledAt",
    });
  }

  async getAssembly(id: string, user: AuthUser): Promise<Assembly> {
    const assembly = await this.prisma.assembly.findFirst({
      where: { id, deletedAt: null },
      include: {
        attendances: { orderBy: { registeredAt: "asc" } },
        votings: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!assembly) throw new NotFoundException("Assembly not found");

    await this.assertReadAccess(user, assembly);
    return assembly;
  }

  async updateStatus(
    id: string,
    dto: UpdateAssemblyStatusDto,
    user: AuthUser,
    request: unknown,
  ): Promise<Assembly> {
    if (!STAFF_ROLES.includes(user.role)) {
      throw new ForbiddenException("Only staff can change assembly status");
    }

    const assembly = await this.prisma.assembly.findFirst({ where: { id, deletedAt: null } });
    if (!assembly) throw new NotFoundException("Assembly not found");

    await this.assertPropertyAccess(user, assembly.propertyId, assembly.companyId);

    this.assertStatusTransition(assembly.status, dto.status);

    const updated = await this.prisma.assembly.update({
      where: { id },
      data: { status: dto.status },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: assembly.companyId,
      propertyId: assembly.propertyId,
      entityName: "Assembly",
      entityId: id,
      action: "UPDATE",
      oldValue: { status: assembly.status },
      newValue: { status: updated.status },
      request,
    });

    return updated;
  }

  // ===== Attendance =====

  async registerAttendance(
    assemblyId: string,
    dto: RegisterAttendanceDto,
    user: AuthUser,
    request: unknown,
  ): Promise<AssemblyAttendance> {
    if (!STAFF_ROLES.includes(user.role)) {
      throw new ForbiddenException("Only staff can register attendance");
    }

    const assembly = await this.prisma.assembly.findFirst({
      where: { id: assemblyId, deletedAt: null },
    });
    if (!assembly) throw new NotFoundException("Assembly not found");

    await this.assertPropertyAccess(user, assembly.propertyId, assembly.companyId);

    const unit = await this.prisma.unit.findFirst({
      where: { id: dto.unitId, propertyId: assembly.propertyId, deletedAt: null },
    });
    if (!unit) throw new NotFoundException("Unit not found in this property");

    // Snapshot del coeficiente ACTUAL de la unidad al momento de registrar.
    const attendance = await this.prisma.assemblyAttendance.upsert({
      where: { assemblyId_unitId: { assemblyId, unitId: dto.unitId } },
      create: {
        assemblyId,
        unitId: dto.unitId,
        coefficient: unit.coefficient,
        present: dto.present ?? true,
        proxyUserId: dto.proxyUserId ?? null,
      },
      update: {
        coefficient: unit.coefficient,
        present: dto.present ?? true,
        proxyUserId: dto.proxyUserId ?? null,
      },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: assembly.companyId,
      propertyId: assembly.propertyId,
      unitId: dto.unitId,
      entityName: "AssemblyAttendance",
      entityId: attendance.id,
      action: "CREATE",
      newValue: attendance,
      request,
    });

    return attendance;
  }

  // ===== Voting =====

  async createVoting(
    assemblyId: string,
    dto: CreateVotingDto,
    user: AuthUser,
    request: unknown,
  ): Promise<Voting> {
    if (!STAFF_ROLES.includes(user.role)) {
      throw new ForbiddenException("Only staff can create votings");
    }

    const assembly = await this.prisma.assembly.findFirst({
      where: { id: assemblyId, deletedAt: null },
    });
    if (!assembly) throw new NotFoundException("Assembly not found");
    if (assembly.status === "CLOSED") {
      throw new BadRequestException("Cannot create votings on a closed assembly");
    }

    await this.assertPropertyAccess(user, assembly.propertyId, assembly.companyId);

    const voting = await this.prisma.voting.create({
      data: {
        assemblyId,
        question: dto.question,
        type: dto.type ?? "COEFFICIENT",
      },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: assembly.companyId,
      propertyId: assembly.propertyId,
      entityName: "Voting",
      entityId: voting.id,
      action: "CREATE",
      newValue: voting,
      request,
    });

    return voting;
  }

  async castVote(
    votingId: string,
    dto: CastVoteDto,
    user: AuthUser,
    request: unknown,
  ): Promise<Vote> {
    const voting = await this.prisma.voting.findFirst({
      where: { id: votingId },
      include: { assembly: true },
    });
    if (!voting) throw new NotFoundException("Voting not found");
    if (voting.status !== "OPEN") {
      throw new BadRequestException("Voting is not open");
    }

    const assembly = voting.assembly;
    if (!assembly || assembly.deletedAt) throw new NotFoundException("Assembly not found");

    // Solo staff con acceso a la property puede registrar votos (votación presencial).
    if (!STAFF_ROLES.includes(user.role)) {
      throw new ForbiddenException("Only staff can register votes");
    }
    await this.assertPropertyAccess(user, assembly.propertyId, assembly.companyId);

    const unit = await this.prisma.unit.findFirst({
      where: { id: dto.unitId, propertyId: assembly.propertyId, deletedAt: null },
    });
    if (!unit) throw new NotFoundException("Unit not found in this property");

    // Una unidad solo puede votar una vez por votación.
    const existing = await this.prisma.vote.findUnique({
      where: { votingId_unitId: { votingId, unitId: dto.unitId } },
    });
    if (existing) throw new ConflictException("Unit has already voted in this voting");

    // Snapshot del coeficiente al votar.
    const vote = await this.prisma.vote.create({
      data: {
        votingId,
        unitId: dto.unitId,
        castById: user.sub,
        choice: dto.choice,
        coefficient: unit.coefficient,
      },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: assembly.companyId,
      propertyId: assembly.propertyId,
      unitId: dto.unitId,
      entityName: "Vote",
      entityId: vote.id,
      action: "CREATE",
      newValue: vote,
      request,
    });

    return vote;
  }

  async closeVoting(votingId: string, user: AuthUser, request: unknown): Promise<Voting> {
    if (!STAFF_ROLES.includes(user.role)) {
      throw new ForbiddenException("Only staff can close votings");
    }

    const voting = await this.prisma.voting.findFirst({
      where: { id: votingId },
      include: { assembly: true },
    });
    if (!voting) throw new NotFoundException("Voting not found");

    const assembly = voting.assembly;
    if (!assembly || assembly.deletedAt) throw new NotFoundException("Assembly not found");

    await this.assertPropertyAccess(user, assembly.propertyId, assembly.companyId);

    if (voting.status === "CLOSED") {
      throw new BadRequestException("Voting is already closed");
    }

    const updated = await this.prisma.voting.update({
      where: { id: votingId },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: assembly.companyId,
      propertyId: assembly.propertyId,
      entityName: "Voting",
      entityId: votingId,
      action: "UPDATE",
      oldValue: { status: voting.status },
      newValue: { status: updated.status },
      request,
    });

    return updated;
  }

  /**
   * Escrutinio de una votación. Agrupa los votos por `choice` y devuelve dos
   * lecturas paralelas para que el cliente decida según el `VotingType`:
   *  - byCount: conteo de votos por opción (mayoría simple).
   *  - byCoefficient: suma de coeficientes por opción (mayoría por coeficiente).
   * Los coeficientes son `Decimal` de Prisma; se convierten con `Number()` y se
   * suman opción por opción. `totals` agrega el total de votos y de coeficiente.
   */
  async tallyVoting(votingId: string, user: AuthUser): Promise<VotingTally> {
    const voting = await this.prisma.voting.findFirst({
      where: { id: votingId },
      include: { assembly: true, votes: true },
    });
    if (!voting) throw new NotFoundException("Voting not found");

    const assembly = voting.assembly;
    if (!assembly || assembly.deletedAt) throw new NotFoundException("Assembly not found");

    await this.assertReadAccess(user, assembly);

    const byCount: Record<VoteChoice, number> = { YES: 0, NO: 0, ABSTAIN: 0, BLANK: 0 };
    const byCoefficient: Record<VoteChoice, number> = { YES: 0, NO: 0, ABSTAIN: 0, BLANK: 0 };
    let totalCoefficient = 0;

    for (const vote of voting.votes) {
      const coef = Number(vote.coefficient);
      byCount[vote.choice] += 1;
      byCoefficient[vote.choice] += coef;
      totalCoefficient += coef;
    }

    return {
      votingId: voting.id,
      type: voting.type,
      status: voting.status,
      byCount,
      byCoefficient,
      totals: { totalVotes: voting.votes.length, totalCoefficient },
    };
  }

  // ===== Helpers =====

  /** Transiciones permitidas: SCHEDULED -> IN_PROGRESS -> CLOSED. */
  private assertStatusTransition(from: Assembly["status"], to: Assembly["status"]): void {
    const allowed: Record<Assembly["status"], Assembly["status"][]> = {
      SCHEDULED: ["IN_PROGRESS"],
      IN_PROGRESS: ["CLOSED"],
      CLOSED: [],
    };
    if (from === to) return;
    if (!allowed[from].includes(to)) {
      throw new BadRequestException(`Invalid status transition from ${from} to ${to}`);
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

  private async assertReadAccess(
    user: AuthUser,
    assembly: Pick<Assembly, "companyId" | "propertyId">,
  ): Promise<void> {
    if (user.role === "SUPERADMIN") return;
    if (user.role === "COMPANY_ADMIN") {
      if (assembly.companyId !== user.companyId) throw new ForbiddenException("Access denied");
      return;
    }
    // PROPERTY_ADMIN y residentes/owners: requieren asignación a la property.
    await this.assertPropertyAccess(user, assembly.propertyId, assembly.companyId);
  }
}
