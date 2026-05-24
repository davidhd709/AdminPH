import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { AnnouncementsService } from "./announcements.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../../core/types/auth-user";

type MockPrisma = {
  property: { findFirst: jest.Mock };
  tower: { findFirst: jest.Mock };
  unit: { findFirst: jest.Mock };
  announcement: { create: jest.Mock; findFirst: jest.Mock };
  announcementRead: { upsert: jest.Mock };
  propertyUser: { findFirst: jest.Mock; findMany: jest.Mock };
};

function buildPrismaMock(): MockPrisma {
  return {
    property: { findFirst: jest.fn() },
    tower: { findFirst: jest.fn() },
    unit: { findFirst: jest.fn() },
    announcement: { create: jest.fn(), findFirst: jest.fn() },
    announcementRead: { upsert: jest.fn() },
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
  companyId: "c1",
};

describe("AnnouncementsService", () => {
  let service: AnnouncementsService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new AnnouncementsService(prisma as unknown as PrismaService, audit);
  });

  afterEach(() => jest.clearAllMocks());

  describe("create", () => {
    it("throws NotFound when property does not exist", async () => {
      prisma.property.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          { propertyId: "p1", scope: "PROPERTY", title: "t", body: "b" },
          superadmin,
          {},
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws Forbidden when a non-staff user tries to create", async () => {
      await expect(
        service.create({ propertyId: "p1", scope: "PROPERTY", title: "t", body: "b" }, owner, {}),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.announcement.create).not.toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("throws NotFound when announcement does not exist", async () => {
      prisma.announcement.findFirst.mockResolvedValue(null);
      await expect(service.findOne("a1", superadmin)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("markAsRead", () => {
    it("upserts an AnnouncementRead idempotently", async () => {
      prisma.announcement.findFirst.mockResolvedValue({
        id: "a1",
        companyId: "c1",
        propertyId: "p1",
      });
      const readAt = new Date("2026-05-01T00:00:00Z");
      prisma.announcementRead.upsert.mockResolvedValue({ readAt });

      const result = await service.markAsRead("a1", superadmin);

      expect(prisma.announcementRead.upsert).toHaveBeenCalledWith({
        where: { announcementId_userId: { announcementId: "a1", userId: "su" } },
        create: { announcementId: "a1", userId: "su" },
        update: {},
      });
      expect(result.readAt).toBe(readAt);
    });
  });
});
