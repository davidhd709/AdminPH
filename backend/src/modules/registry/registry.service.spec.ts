import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { RegistryService } from "./registry.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../../core/types/auth-user";

type MockPrisma = {
  unit: { findFirst: jest.Mock };
  pet: {
    create: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
  vehicle: {
    create: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
  owner: { findFirst: jest.Mock; findMany: jest.Mock };
  resident: { findFirst: jest.Mock; findMany: jest.Mock };
  propertyUser: { findFirst: jest.Mock; findMany: jest.Mock };
};

function buildPrismaMock(): MockPrisma {
  return {
    unit: { findFirst: jest.fn() },
    pet: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    vehicle: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    owner: { findFirst: jest.fn(), findMany: jest.fn() },
    resident: { findFirst: jest.fn(), findMany: jest.fn() },
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

const unitWithProperty = {
  id: "u1",
  propertyId: "p1",
  property: { id: "p1", companyId: "c1" },
};

describe("RegistryService", () => {
  let service: RegistryService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new RegistryService(prisma as unknown as PrismaService, audit);
  });

  afterEach(() => jest.clearAllMocks());

  describe("createPet", () => {
    it("throws NotFound when unit does not exist", async () => {
      prisma.unit.findFirst.mockResolvedValue(null);
      await expect(
        service.createPet({ unitId: "u1", name: "Firu", species: "perro" }, superadmin, {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("creates a pet for SUPERADMIN", async () => {
      prisma.unit.findFirst.mockResolvedValue(unitWithProperty);
      prisma.pet.create.mockResolvedValue({
        id: "pet1",
        companyId: "c1",
        propertyId: "p1",
        unitId: "u1",
        name: "Firu",
        species: "perro",
      });
      const result = await service.createPet(
        { unitId: "u1", name: "Firu", species: "perro" },
        superadmin,
        {},
      );
      expect(result.id).toBe("pet1");
      expect(prisma.pet.create).toHaveBeenCalled();
    });

    it("allows an OWNER with an owner row and creates the pet", async () => {
      prisma.unit.findFirst.mockResolvedValue(unitWithProperty);
      prisma.owner.findFirst.mockResolvedValue({ id: "ow1", unitId: "u1", userId: "owner-1" });
      prisma.resident.findFirst.mockResolvedValue(null);
      prisma.pet.create.mockResolvedValue({ id: "pet2", unitId: "u1" });

      const result = await service.createPet(
        { unitId: "u1", name: "Mishi", species: "gato" },
        owner,
        {},
      );
      expect(result.id).toBe("pet2");
    });

    it("forbids an OWNER without an owner/resident row", async () => {
      prisma.unit.findFirst.mockResolvedValue(unitWithProperty);
      prisma.owner.findFirst.mockResolvedValue(null);
      prisma.resident.findFirst.mockResolvedValue(null);

      await expect(
        service.createPet({ unitId: "u1", name: "Mishi", species: "gato" }, owner, {}),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("createVehicle", () => {
    it("throws Conflict when plate already exists in the property", async () => {
      prisma.unit.findFirst.mockResolvedValue(unitWithProperty);
      prisma.vehicle.findFirst.mockResolvedValue({ id: "v0", plate: "ABC123" });

      await expect(
        service.createVehicle({ unitId: "u1", plate: "ABC123" }, superadmin, {}),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("removeVehicle", () => {
    it("soft deletes by setting deletedAt", async () => {
      prisma.vehicle.findFirst.mockResolvedValue({
        id: "v1",
        companyId: "c1",
        propertyId: "p1",
        unitId: "u1",
        deletedAt: null,
      });
      prisma.unit.findFirst.mockResolvedValue(unitWithProperty);
      prisma.vehicle.update.mockResolvedValue({ id: "v1", deletedAt: new Date() });

      await service.removeVehicle("v1", superadmin, {});

      expect(prisma.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "v1" },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
