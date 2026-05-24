import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../../core/types/auth-user";

type MockPrisma = {
  property: { findFirst: jest.Mock };
  document: { create: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
  propertyUser: { findFirst: jest.Mock; findMany: jest.Mock };
};

function buildPrismaMock(): MockPrisma {
  return {
    property: { findFirst: jest.fn() },
    document: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
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

describe("DocumentsService", () => {
  let service: DocumentsService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new DocumentsService(prisma as unknown as PrismaService, audit);
  });

  afterEach(() => jest.clearAllMocks());

  describe("create", () => {
    it("throws NotFound when property does not exist", async () => {
      prisma.property.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          { propertyId: "p1", type: "REGULATION", title: "t", fileUrl: "f.pdf" },
          superadmin,
          {},
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws Forbidden when the user is not staff", async () => {
      await expect(
        service.create(
          { propertyId: "p1", type: "REGULATION", title: "t", fileUrl: "f.pdf" },
          owner,
          {},
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.property.findFirst).not.toHaveBeenCalled();
    });
  });

  describe("newVersion", () => {
    it("increments version from the latest existing document", async () => {
      const existing = {
        id: "doc1",
        companyId: "c1",
        propertyId: "p1",
        type: "REGULATION",
        title: "Reglamento",
        description: "old",
        version: 1,
      };
      prisma.document.findFirst
        .mockResolvedValueOnce(existing) // lookup by id
        .mockResolvedValueOnce(existing); // latest version (same row)
      prisma.document.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: "doc2", ...data }),
      );

      const result = await service.newVersion(
        "doc1",
        { fileUrl: "reglamento-v2.pdf" },
        superadmin,
        {},
      );

      expect(result.version).toBe(2);
      expect(result.title).toBe("Reglamento");
      expect(result.fileUrl).toBe("reglamento-v2.pdf");
      expect(prisma.document.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("remove", () => {
    it("soft deletes a document for staff", async () => {
      prisma.document.findFirst.mockResolvedValue({
        id: "doc1",
        companyId: "c1",
        propertyId: "p1",
      });
      prisma.document.update.mockResolvedValue({ id: "doc1", deletedAt: new Date() });

      const result = await service.remove("doc1", superadmin, {});

      expect(result).toEqual({ deleted: true });
      expect(prisma.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "doc1" },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "DELETE", entityName: "Document" }),
      );
    });
  });
});
