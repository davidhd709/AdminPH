import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { VisitorsService } from "./visitors.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../../core/types/auth-user";

type MockPrisma = {
  property: { findFirst: jest.Mock };
  unit: { findFirst: jest.Mock };
  visitor: {
    create: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
  propertyUser: { findFirst: jest.Mock; findMany: jest.Mock };
};

function buildPrismaMock(): MockPrisma {
  return {
    property: { findFirst: jest.fn() },
    unit: { findFirst: jest.fn() },
    visitor: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    propertyUser: { findFirst: jest.fn(), findMany: jest.fn() },
  };
}

const audit = { log: jest.fn() } as unknown as AuditService;

const security: AuthUser = {
  sub: "sec-1",
  email: "sec@x.com",
  role: "SECURITY",
  companyId: null,
};
const owner: AuthUser = {
  sub: "owner-1",
  email: "o@x.com",
  role: "OWNER",
  companyId: null,
};

describe("VisitorsService", () => {
  let service: VisitorsService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new VisitorsService(prisma as unknown as PrismaService, audit);
  });

  afterEach(() => jest.clearAllMocks());

  describe("register", () => {
    it("throws NotFound when property does not exist", async () => {
      prisma.property.findFirst.mockResolvedValue(null);
      await expect(
        service.register({ propertyId: "p1", fullName: "Juan" }, security, {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("registers a visitor for SECURITY with a valid property", async () => {
      prisma.property.findFirst.mockResolvedValue({ id: "p1", companyId: "c1" });
      prisma.propertyUser.findFirst.mockResolvedValue({ id: "pu1", propertyId: "p1" });
      prisma.visitor.create.mockResolvedValue({
        id: "v1",
        propertyId: "p1",
        companyId: "c1",
        fullName: "Juan",
        type: "VISITOR",
        entryAt: new Date(),
        exitAt: null,
      });

      const result = await service.register({ propertyId: "p1", fullName: "Juan" }, security, {});

      expect(result.id).toBe("v1");
      expect(prisma.visitor.create).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    it("throws Forbidden for an OWNER", async () => {
      const query = { page: 1, pageSize: 20, sortOrder: "desc" as const };
      await expect(service.findAll(owner, query, query)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("registerExit", () => {
    it("throws BadRequest when exit already registered", async () => {
      prisma.visitor.findFirst.mockResolvedValue({
        id: "v1",
        propertyId: "p1",
        companyId: "c1",
        exitAt: new Date("2026-05-24T10:00:00Z"),
      });
      prisma.propertyUser.findFirst.mockResolvedValue({ id: "pu1", propertyId: "p1" });

      await expect(service.registerExit("v1", security, {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
