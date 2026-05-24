import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { AssembliesService } from "./assemblies.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../../core/types/auth-user";

type MockPrisma = {
  property: { findFirst: jest.Mock };
  unit: { findFirst: jest.Mock };
  assembly: { create: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
  assemblyAttendance: { upsert: jest.Mock };
  voting: { create: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
  vote: { create: jest.Mock; findUnique: jest.Mock };
  propertyUser: { findFirst: jest.Mock; findMany: jest.Mock };
};

function buildPrismaMock(): MockPrisma {
  return {
    property: { findFirst: jest.fn() },
    unit: { findFirst: jest.fn() },
    assembly: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    assemblyAttendance: { upsert: jest.fn() },
    voting: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    vote: { create: jest.fn(), findUnique: jest.fn() },
    propertyUser: { findFirst: jest.fn(), findMany: jest.fn() },
  };
}

const audit = { log: jest.fn() } as unknown as AuditService;

const superadmin: AuthUser = {
  sub: "su",
  email: "su@x.com",
  role: "SUPERADMIN",
  companyId: null,
};
const owner: AuthUser = {
  sub: "owner-1",
  email: "o@x.com",
  role: "OWNER",
  companyId: null,
};

const openVoting = {
  id: "v1",
  status: "OPEN",
  type: "COEFFICIENT",
  assembly: { id: "a1", companyId: "c1", propertyId: "p1", deletedAt: null },
};

describe("AssembliesService", () => {
  let service: AssembliesService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new AssembliesService(prisma as unknown as PrismaService, audit);
  });

  afterEach(() => jest.clearAllMocks());

  describe("createAssembly", () => {
    it("creates an assembly for SUPERADMIN", async () => {
      prisma.property.findFirst.mockResolvedValue({ id: "p1", companyId: "c1" });
      prisma.assembly.create.mockResolvedValue({
        id: "a1",
        propertyId: "p1",
        companyId: "c1",
        status: "SCHEDULED",
      });
      const result = await service.createAssembly(
        { propertyId: "p1", title: "Ordinaria", scheduledAt: "2026-06-01T10:00:00Z" },
        superadmin,
        {},
      );
      expect(result.id).toBe("a1");
      expect(prisma.assembly.create).toHaveBeenCalled();
    });

    it("throws NotFound when property does not exist", async () => {
      prisma.property.findFirst.mockResolvedValue(null);
      await expect(
        service.createAssembly(
          { propertyId: "p1", title: "x", scheduledAt: "2026-06-01T10:00:00Z" },
          superadmin,
          {},
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("registerAttendance", () => {
    it("forbids non-staff from registering attendance", async () => {
      await expect(
        service.registerAttendance("a1", { unitId: "u1" }, owner, {}),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("snapshots the unit coefficient when staff registers attendance", async () => {
      prisma.assembly.findFirst.mockResolvedValue({ id: "a1", companyId: "c1", propertyId: "p1" });
      prisma.unit.findFirst.mockResolvedValue({ id: "u1", coefficient: "0.012345" });
      prisma.assemblyAttendance.upsert.mockResolvedValue({ id: "att1", coefficient: "0.012345" });

      await service.registerAttendance("a1", { unitId: "u1" }, superadmin, {});

      const args = prisma.assemblyAttendance.upsert.mock.calls[0][0];
      expect(args.create.coefficient).toBe("0.012345");
    });
  });

  describe("castVote", () => {
    it("throws Conflict if the unit has already voted", async () => {
      prisma.voting.findFirst.mockResolvedValue(openVoting);
      prisma.unit.findFirst.mockResolvedValue({ id: "u1", coefficient: "0.1" });
      prisma.vote.findUnique.mockResolvedValue({ id: "existing-vote" });

      await expect(
        service.castVote("v1", { unitId: "u1", choice: "YES" }, superadmin, {}),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.vote.create).not.toHaveBeenCalled();
    });

    it("throws BadRequest if the voting is not OPEN", async () => {
      prisma.voting.findFirst.mockResolvedValue({ ...openVoting, status: "CLOSED" });

      await expect(
        service.castVote("v1", { unitId: "u1", choice: "YES" }, superadmin, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("tallyVoting", () => {
    it("computes byCount and byCoefficient correctly from mixed votes", async () => {
      prisma.voting.findFirst.mockResolvedValue({
        id: "v1",
        type: "COEFFICIENT",
        status: "CLOSED",
        assembly: { id: "a1", companyId: "c1", propertyId: "p1", deletedAt: null },
        votes: [
          { choice: "YES", coefficient: "0.30" },
          { choice: "YES", coefficient: "0.20" },
          { choice: "NO", coefficient: "0.15" },
          { choice: "ABSTAIN", coefficient: "0.10" },
          { choice: "BLANK", coefficient: "0.05" },
        ],
      });

      const tally = await service.tallyVoting("v1", superadmin);

      // Conteo de votos por opción.
      expect(tally.byCount).toEqual({ YES: 2, NO: 1, ABSTAIN: 1, BLANK: 1 });
      // Suma de coeficientes por opción (Number sobre el Decimal).
      expect(tally.byCoefficient.YES).toBeCloseTo(0.5, 8);
      expect(tally.byCoefficient.NO).toBeCloseTo(0.15, 8);
      expect(tally.byCoefficient.ABSTAIN).toBeCloseTo(0.1, 8);
      expect(tally.byCoefficient.BLANK).toBeCloseTo(0.05, 8);
      // Totales.
      expect(tally.totals.totalVotes).toBe(5);
      expect(tally.totals.totalCoefficient).toBeCloseTo(0.8, 8);
    });
  });
});
