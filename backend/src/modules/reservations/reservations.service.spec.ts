import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { ReservationsService } from "./reservations.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../../core/types/auth-user";

type MockPrisma = {
  property: { findFirst: jest.Mock };
  unit: { findFirst: jest.Mock };
  commonArea: { create: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock; count: jest.Mock };
  reservation: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
  };
  propertyUser: { findFirst: jest.Mock; findMany: jest.Mock };
};

function buildPrismaMock(): MockPrisma {
  return {
    property: { findFirst: jest.fn() },
    unit: { findFirst: jest.fn() },
    commonArea: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    reservation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
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

const activeArea = {
  id: "area-1",
  companyId: "c1",
  propertyId: "p1",
  name: "Salón social",
  active: true,
  deletedAt: null,
};

describe("ReservationsService", () => {
  let service: ReservationsService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new ReservationsService(prisma as unknown as PrismaService, audit);
  });

  afterEach(() => jest.clearAllMocks());

  describe("createReservation", () => {
    it("throws BadRequest when startTime >= endTime", async () => {
      await expect(
        service.createReservation(
          {
            commonAreaId: "area-1",
            startTime: "2026-06-01T22:00:00Z",
            endTime: "2026-06-01T18:00:00Z",
          },
          superadmin,
          {},
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws Conflict when there is an overlapping reservation", async () => {
      prisma.commonArea.findFirst.mockResolvedValue(activeArea);
      prisma.reservation.findFirst.mockResolvedValue({ id: "existing", status: "APPROVED" });

      await expect(
        service.createReservation(
          {
            commonAreaId: "area-1",
            startTime: "2026-06-01T18:00:00Z",
            endTime: "2026-06-01T22:00:00Z",
          },
          superadmin,
          {},
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("creates a PENDING reservation when there is no overlap", async () => {
      prisma.commonArea.findFirst.mockResolvedValue(activeArea);
      prisma.reservation.findFirst.mockResolvedValue(null);
      prisma.reservation.create.mockResolvedValue({
        id: "res-1",
        status: "PENDING",
        commonAreaId: "area-1",
        companyId: "c1",
        propertyId: "p1",
      });

      const result = await service.createReservation(
        {
          commonAreaId: "area-1",
          startTime: "2026-06-01T18:00:00Z",
          endTime: "2026-06-01T22:00:00Z",
        },
        superadmin,
        {},
      );

      expect(result.status).toBe("PENDING");
      expect(prisma.reservation.create).toHaveBeenCalled();
      const createArg = prisma.reservation.create.mock.calls[0][0];
      expect(createArg.data.status).toBe("PENDING");
      expect(createArg.data.requestedById).toBe("su");
    });
  });

  describe("review", () => {
    it("forbids non-staff from reviewing", async () => {
      await expect(
        service.review("res-1", { status: "APPROVED" }, owner, {}),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("cancel", () => {
    it("forbids an OWNER from cancelling someone else's reservation", async () => {
      prisma.reservation.findFirst.mockResolvedValue({
        id: "res-1",
        companyId: "c1",
        propertyId: "p1",
        requestedById: "another-user",
        status: "PENDING",
      });

      await expect(service.cancel("res-1", owner, {})).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
