import { NotFoundException } from "@nestjs/common";
import { FeesService } from "./fees.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

type MockPrisma = {
  property: { findFirst: jest.Mock };
  feeConcept: { findFirst: jest.Mock };
  unit: { findMany: jest.Mock };
  fee: { findFirst: jest.Mock; create: jest.Mock; findMany: jest.Mock };
  propertyUser: { findFirst: jest.Mock };
};

function buildPrismaMock(): MockPrisma {
  return {
    property: { findFirst: jest.fn() },
    feeConcept: { findFirst: jest.fn() },
    unit: { findMany: jest.fn() },
    fee: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    propertyUser: { findFirst: jest.fn() },
  };
}

const superadmin = { sub: "u1", role: "SUPERADMIN", companyId: null };

const baseDto = {
  propertyId: "prop-1",
  conceptId: "concept-1",
  period: "2026-05",
  dueDate: new Date("2026-05-31"),
};

describe("FeesService", () => {
  let service: FeesService;
  let prisma: MockPrisma;
  let audit: { log: jest.Mock };

  beforeEach(() => {
    prisma = buildPrismaMock();
    audit = { log: jest.fn() };
    service = new FeesService(prisma as unknown as PrismaService, audit as unknown as AuditService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("generateMassFees", () => {
    it("throws NotFoundException when the property does not exist", async () => {
      prisma.property.findFirst.mockResolvedValue(null);

      await expect(service.generateMassFees(baseDto as any, superadmin, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("creates a FIXED fee using defaultAmount when no baseAmount is provided", async () => {
      prisma.property.findFirst.mockResolvedValue({ id: "prop-1", companyId: "co-1" });
      prisma.feeConcept.findFirst.mockResolvedValue({
        id: "concept-1",
        calculationType: "FIXED",
        defaultAmount: 100,
      });
      prisma.unit.findMany.mockResolvedValue([{ id: "unit-1", code: "A-101", coefficient: 1 }]);
      prisma.fee.findFirst.mockResolvedValue(null);
      prisma.fee.create.mockResolvedValue({});

      const summary = await service.generateMassFees(baseDto as any, superadmin, {});

      expect(prisma.fee.create).toHaveBeenCalledTimes(1);
      expect(prisma.fee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amount: 100, pendingAmount: 100 }),
        }),
      );
      expect(summary.createdFees).toBe(1);
      expect(summary.totalAmount).toBe(100);
    });

    it("skips fees that already exist for the unit/concept/period", async () => {
      prisma.property.findFirst.mockResolvedValue({ id: "prop-1", companyId: "co-1" });
      prisma.feeConcept.findFirst.mockResolvedValue({
        id: "concept-1",
        calculationType: "FIXED",
        defaultAmount: 100,
      });
      prisma.unit.findMany.mockResolvedValue([{ id: "unit-1", code: "A-101", coefficient: 1 }]);
      prisma.fee.findFirst.mockResolvedValue({ id: "existing-fee" });

      const summary = await service.generateMassFees(baseDto as any, superadmin, {});

      expect(prisma.fee.create).not.toHaveBeenCalled();
      expect(summary.skippedFees).toBe(1);
      expect(summary.createdFees).toBe(0);
    });
  });

  describe("findOne", () => {
    it("throws NotFoundException when the fee does not exist", async () => {
      prisma.fee.findFirst.mockResolvedValue(null);

      await expect(service.findOne("missing", superadmin)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
