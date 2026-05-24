import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { buildRadicado, PqrService } from "./pqr.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../../core/types/auth-user";

type MockPrisma = {
  property: { findFirst: jest.Mock };
  unit: { findFirst: jest.Mock };
  pqr: { create: jest.Mock; findFirst: jest.Mock };
  propertyUser: { findFirst: jest.Mock; findMany: jest.Mock };
};

function buildPrismaMock(): MockPrisma {
  return {
    property: { findFirst: jest.fn() },
    unit: { findFirst: jest.fn() },
    pqr: { create: jest.fn(), findFirst: jest.fn() },
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

describe("PqrService", () => {
  let service: PqrService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new PqrService(prisma as unknown as PrismaService, audit);
  });

  afterEach(() => jest.clearAllMocks());

  describe("buildRadicado", () => {
    it("formats PQR-YYYY-000NNN from ticketNumber + createdAt", () => {
      const r = buildRadicado({ ticketNumber: 42, createdAt: new Date("2026-05-01T00:00:00Z") });
      expect(r).toBe("PQR-2026-000042");
    });
  });

  describe("create", () => {
    it("throws NotFound when property does not exist", async () => {
      prisma.property.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          { propertyId: "p1", category: "PETITION", subject: "s", description: "d" },
          superadmin,
          {},
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("creates a PQR for SUPERADMIN", async () => {
      prisma.property.findFirst.mockResolvedValue({ id: "p1", companyId: "c1" });
      prisma.pqr.create.mockResolvedValue({
        id: "pqr1",
        ticketNumber: 1,
        propertyId: "p1",
        companyId: "c1",
        createdAt: new Date(),
        status: "OPEN",
      });
      const result = await service.create(
        { propertyId: "p1", category: "COMPLAINT", subject: "s", description: "d" },
        superadmin,
        {},
      );
      expect(result.id).toBe("pqr1");
      expect(prisma.pqr.create).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("denies an OWNER reading someone else's PQR", async () => {
      prisma.pqr.findFirst.mockResolvedValue({
        id: "pqr1",
        companyId: "c1",
        propertyId: "p1",
        createdById: "another-user",
        ticketNumber: 1,
        createdAt: new Date(),
        responses: [],
      });
      await expect(service.findOne("pqr1", owner)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("allows the author to read their own PQR and returns radicado", async () => {
      prisma.pqr.findFirst.mockResolvedValue({
        id: "pqr1",
        companyId: "c1",
        propertyId: "p1",
        createdById: "owner-1",
        ticketNumber: 7,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        responses: [],
      });
      const res = await service.findOne("pqr1", owner);
      expect(res.radicado).toBe("PQR-2026-000007");
    });
  });

  describe("updateStatus", () => {
    it("forbids non-staff from changing status", async () => {
      prisma.pqr.findFirst.mockResolvedValue({
        id: "pqr1",
        companyId: "c1",
        propertyId: "p1",
        createdById: "owner-1",
      });
      await expect(
        service.updateStatus("pqr1", { status: "RESOLVED" }, owner, {}),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
