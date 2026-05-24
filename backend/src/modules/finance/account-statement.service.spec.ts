import { AccountStatementService } from "./account-statement.service";
import { PrismaService } from "../prisma/prisma.service";

type MockPrisma = {
  unit: { findFirst: jest.Mock };
  fee: { findMany: jest.Mock };
  payment: { findMany: jest.Mock };
  owner: { findFirst: jest.Mock };
  resident: { findFirst: jest.Mock };
};

function buildPrismaMock(): MockPrisma {
  return {
    unit: { findFirst: jest.fn() },
    fee: { findMany: jest.fn() },
    payment: { findMany: jest.fn() },
    owner: { findFirst: jest.fn() },
    resident: { findFirst: jest.fn() },
  };
}

const superadmin = { sub: "u1", role: "SUPERADMIN", companyId: null };

const mockUnit = {
  id: "unit-1",
  code: "A-101",
  property: { name: "Torre Norte", companyId: "co-1" },
  tower: { name: "Torre 1" },
  owners: [{ id: "owner-1", userId: "u9", isPrimary: true, status: "ACTIVE" }],
};

describe("AccountStatementService", () => {
  let service: AccountStatementService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new AccountStatementService(prisma as unknown as PrismaService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("validatePazYSalvo", () => {
    it("returns canGenerate=true when there is no pending balance", async () => {
      prisma.unit.findFirst.mockResolvedValue(mockUnit);
      prisma.fee.findMany.mockResolvedValue([
        { id: "fee-1", pendingAmount: 0, paidAmount: 100, dueDate: new Date("2026-01-01") },
      ]);
      prisma.payment.findMany.mockResolvedValue([]);

      const result = await service.validatePazYSalvo("unit-1", superadmin);

      expect(result.canGenerate).toBe(true);
      expect(result.totalPending).toBe(0);
      expect(result.pendingFees).toEqual([]);
    });

    it("returns canGenerate=false when there is outstanding debt", async () => {
      prisma.unit.findFirst.mockResolvedValue(mockUnit);
      prisma.fee.findMany.mockResolvedValue([
        { id: "fee-1", pendingAmount: 50, paidAmount: 0, dueDate: new Date("2026-01-01") },
      ]);
      prisma.payment.findMany.mockResolvedValue([]);

      const result = await service.validatePazYSalvo("unit-1", superadmin);

      expect(result.canGenerate).toBe(false);
      expect(result.totalPending).toBe(50);
      expect(result.pendingFees).toHaveLength(1);
    });
  });
});
