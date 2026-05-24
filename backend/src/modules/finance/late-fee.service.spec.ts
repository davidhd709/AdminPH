import { ForbiddenException } from "@nestjs/common";
import { LateFeeService } from "./late-fee.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

type MockPrisma = {
  lateFeeConfig: { findFirst: jest.Mock };
  fee: { findMany: jest.Mock };
  property: { findFirst: jest.Mock };
};

function buildPrismaMock(): MockPrisma {
  return {
    lateFeeConfig: { findFirst: jest.fn() },
    fee: { findMany: jest.fn() },
    property: { findFirst: jest.fn() },
  };
}

const superadmin = { sub: "u1", role: "SUPERADMIN", companyId: null };

describe("LateFeeService", () => {
  let service: LateFeeService;
  let prisma: MockPrisma;
  let audit: { log: jest.Mock };

  beforeEach(() => {
    prisma = buildPrismaMock();
    audit = { log: jest.fn() };
    service = new LateFeeService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  describe("getConfig", () => {
    it("returns null when there is no config", async () => {
      prisma.lateFeeConfig.findFirst.mockResolvedValue(null);

      const result = await service.getConfig("prop-1", superadmin);

      expect(result).toBeNull();
    });
  });

  describe("calculateAndGenerateInterest", () => {
    it("throws ForbiddenException when there is no active config", async () => {
      prisma.lateFeeConfig.findFirst.mockResolvedValue(null);

      await expect(
        service.calculateAndGenerateInterest("prop-1", superadmin, {}),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("throws ForbiddenException when the config is inactive", async () => {
      prisma.lateFeeConfig.findFirst.mockResolvedValue({
        id: "cfg-1",
        propertyId: "prop-1",
        active: false,
      });

      await expect(
        service.calculateAndGenerateInterest("prop-1", superadmin, {}),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
