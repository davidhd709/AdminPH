import { ConflictException, ForbiddenException } from "@nestjs/common";
import { AccountingService } from "./accounting.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../../core/types/auth-user";

type MockPrisma = {
  property: { findFirst: jest.Mock };
  bankAccount: { findFirst: jest.Mock };
  accountingCategory: { findFirst: jest.Mock; findMany: jest.Mock };
  transaction: {
    create: jest.Mock;
    findFirst: jest.Mock;
    groupBy: jest.Mock;
    aggregate: jest.Mock;
  };
  budget: { findFirst: jest.Mock; create: jest.Mock };
  propertyUser: { findFirst: jest.Mock; findMany: jest.Mock };
};

function buildPrismaMock(): MockPrisma {
  return {
    property: { findFirst: jest.fn() },
    bankAccount: { findFirst: jest.fn() },
    accountingCategory: { findFirst: jest.fn(), findMany: jest.fn() },
    transaction: {
      create: jest.fn(),
      findFirst: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    budget: { findFirst: jest.fn(), create: jest.fn() },
    propertyUser: { findFirst: jest.fn(), findMany: jest.fn() },
  };
}

const audit = { log: jest.fn() } as unknown as AuditService;

const owner: AuthUser = {
  sub: "owner-1",
  email: "o@x.com",
  role: "OWNER",
  companyId: null,
};
const accountant: AuthUser = {
  sub: "acc-1",
  email: "acc@x.com",
  role: "ACCOUNTANT",
  companyId: "c1",
};
const superadmin: AuthUser = {
  sub: "su",
  email: "su@x.com",
  role: "SUPERADMIN",
  companyId: null,
};

const validTransactionDto = {
  propertyId: "p1",
  type: "EXPENSE" as const,
  amount: 1000,
  description: "Pago energía",
  date: "2026-05-24",
};

describe("AccountingService", () => {
  let service: AccountingService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new AccountingService(prisma as unknown as PrismaService, audit);
  });

  afterEach(() => jest.clearAllMocks());

  describe("createTransaction", () => {
    it("throws Forbidden when role is OWNER (non-financial)", async () => {
      await expect(
        service.createTransaction(validTransactionDto, owner, {}),
      ).rejects.toBeInstanceOf(ForbiddenException);
      // No debe siquiera tocar la BD.
      expect(prisma.property.findFirst).not.toHaveBeenCalled();
    });

    it("creates a transaction for ACCOUNTANT with a valid assigned property", async () => {
      prisma.property.findFirst.mockResolvedValue({ id: "p1", companyId: "c1" });
      prisma.propertyUser.findFirst.mockResolvedValue({ userId: "acc-1", propertyId: "p1" });
      prisma.transaction.create.mockResolvedValue({
        id: "tx1",
        propertyId: "p1",
        companyId: "c1",
        type: "EXPENSE",
        amount: 1000,
      });

      const result = await service.createTransaction(validTransactionDto, accountant, {});

      expect(result.id).toBe("tx1");
      expect(prisma.transaction.create).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ entityName: "Transaction", action: "CREATE" }),
      );
    });
  });

  describe("createBudget", () => {
    it("throws Conflict when a budget already exists for propertyId+year", async () => {
      prisma.property.findFirst.mockResolvedValue({ id: "p1", companyId: "c1" });
      prisma.propertyUser.findFirst.mockResolvedValue({ userId: "acc-1", propertyId: "p1" });
      prisma.budget.findFirst.mockResolvedValue({ id: "b1", propertyId: "p1", year: 2026 });

      await expect(
        service.createBudget({ propertyId: "p1", year: 2026 }, accountant, {}),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.budget.create).not.toHaveBeenCalled();
    });
  });

  describe("getBudgetExecution", () => {
    it("computes planned vs executed vs variance per category", async () => {
      prisma.property.findFirst.mockResolvedValue({ id: "p1", companyId: "c1" });
      // SUPERADMIN: salta el chequeo de propertyUser.
      prisma.budget.findFirst.mockResolvedValue({
        id: "b1",
        propertyId: "p1",
        year: 2026,
        items: [
          {
            categoryId: "cat-income",
            plannedAmount: 10000,
            category: { name: "Cuotas administración", type: "INCOME" },
          },
          {
            categoryId: "cat-expense",
            plannedAmount: 8000,
            category: { name: "Mantenimiento", type: "EXPENSE" },
          },
          {
            categoryId: "cat-untouched",
            plannedAmount: 5000,
            category: { name: "Imprevistos", type: "EXPENSE" },
          },
        ],
      });
      prisma.transaction.groupBy.mockResolvedValue([
        { categoryId: "cat-income", _sum: { amount: 9500 } },
        { categoryId: "cat-expense", _sum: { amount: 8200 } },
      ]);

      const rows = await service.getBudgetExecution("p1", 2026, superadmin);

      expect(rows).toHaveLength(3);

      const income = rows.find((r) => r.categoryId === "cat-income")!;
      expect(income).toMatchObject({
        categoryName: "Cuotas administración",
        type: "INCOME",
        planned: 10000,
        executed: 9500,
        variance: 500, // 10000 - 9500 (sobró presupuesto)
      });

      const expense = rows.find((r) => r.categoryId === "cat-expense")!;
      expect(expense).toMatchObject({
        planned: 8000,
        executed: 8200,
        variance: -200, // 8000 - 8200 (sobreejecución)
      });

      // Categoría sin transacciones: executed = 0, variance = planned.
      const untouched = rows.find((r) => r.categoryId === "cat-untouched")!;
      expect(untouched).toMatchObject({ planned: 5000, executed: 0, variance: 5000 });
    });
  });

  describe("reportIncomeExpense", () => {
    it("computes totalIncome, totalExpense and balance", async () => {
      prisma.property.findFirst.mockResolvedValue({ id: "p1", companyId: "c1" });
      prisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 12000 } }) // INCOME
        .mockResolvedValueOnce({ _sum: { amount: 4500 } }); // EXPENSE

      const report = await service.reportIncomeExpense(
        "p1",
        "2026-01-01",
        "2026-12-31",
        superadmin,
      );

      expect(report).toEqual({
        totalIncome: 12000,
        totalExpense: 4500,
        balance: 7500,
      });
    });
  });
});
