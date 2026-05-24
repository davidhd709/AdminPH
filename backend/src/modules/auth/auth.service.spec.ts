import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { AuthService, RefreshTokenReuseError } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed"),
  compare: jest.fn(),
}));

const bcryptCompare = bcrypt.compare as unknown as jest.Mock;

type MockPrisma = {
  user: { findFirst: jest.Mock; update: jest.Mock };
  refreshToken: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
};

function buildPrismaMock(): MockPrisma {
  return {
    user: { findFirst: jest.fn(), update: jest.fn() },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}

const baseUser = {
  id: "user-1",
  email: "a@b.com",
  password: "hashed",
  fullName: "A",
  document: "1",
  phone: null,
  globalRole: "OWNER",
  failedLoginCount: 0,
  lastFailedLoginAt: null,
  lockedUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  companyId: null,
};

describe("AuthService", () => {
  let service: AuthService;
  let prisma: MockPrisma;
  let jwt: { sign: jest.Mock; verifyAsync: jest.Mock };

  beforeEach(() => {
    prisma = buildPrismaMock();
    jwt = { sign: jest.fn().mockReturnValue("signed.jwt.token"), verifyAsync: jest.fn() };
    service = new AuthService(prisma as unknown as PrismaService, jwt as unknown as JwtService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("validateUser", () => {
    it("returns invalid when user does not exist", async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      const res = await service.validateUser("x@y.com", "pw");
      expect(res).toEqual({ kind: "invalid" });
    });

    it("returns locked when lockedUntil is in the future", async () => {
      const until = new Date(Date.now() + 60_000);
      prisma.user.findFirst.mockResolvedValue({ ...baseUser, lockedUntil: until });
      const res = await service.validateUser("a@b.com", "pw");
      expect(res).toEqual({ kind: "locked", until });
    });

    it("records failed login and returns invalid on wrong password", async () => {
      prisma.user.findFirst.mockResolvedValue({ ...baseUser });
      bcryptCompare.mockResolvedValue(false);
      const res = await service.validateUser("a@b.com", "wrong");
      expect(res).toEqual({ kind: "invalid" });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ failedLoginCount: 1 }),
        }),
      );
    });

    it("locks the account at the 5th failed attempt within the window", async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...baseUser,
        failedLoginCount: 4,
        lastFailedLoginAt: new Date(),
      });
      bcryptCompare.mockResolvedValue(false);
      await service.validateUser("a@b.com", "wrong");
      const updateArg = prisma.user.update.mock.calls[0][0];
      expect(updateArg.data.failedLoginCount).toBe(5);
      expect(updateArg.data.lockedUntil).toBeInstanceOf(Date);
    });

    it("returns ok and resets counters on correct password", async () => {
      prisma.user.findFirst.mockResolvedValue({ ...baseUser, failedLoginCount: 2 });
      bcryptCompare.mockResolvedValue(true);
      const res = await service.validateUser("a@b.com", "right");
      expect(res.kind).toBe("ok");
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { failedLoginCount: 0, lastFailedLoginAt: null, lockedUntil: null },
        }),
      );
    });
  });

  describe("rotateRefreshToken", () => {
    it("revokes all tokens and throws when the token hash is not found (reuse)", async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: "user-1", email: "a@b.com" });
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.rotateRefreshToken("some.jwt")).rejects.toBeInstanceOf(
        RefreshTokenReuseError,
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-1", revokedAt: null } }),
      );
    });

    it("revokes all tokens when the token was already revoked (reuse)", async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: "user-1", email: "a@b.com" });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: "rt-1",
        userId: "user-1",
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(service.rotateRefreshToken("some.jwt")).rejects.toBeInstanceOf(
        RefreshTokenReuseError,
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });

    it("rotates: revokes the old token and issues a new pair", async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: "user-1", email: "a@b.com" });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: "rt-1",
        userId: "user-1",
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      prisma.user.findFirst.mockResolvedValue({ ...baseUser });
      prisma.refreshToken.create.mockResolvedValue({});

      const tokens = await service.rotateRefreshToken("some.jwt");
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: "rt-1" },
        data: { revokedAt: expect.any(Date) },
      });
      expect(tokens).toHaveProperty("access_token");
      expect(tokens).toHaveProperty("refresh_token");
    });
  });

  describe("hashRefreshToken", () => {
    it("is deterministic (same input -> same hash)", () => {
      const a = AuthService.hashRefreshToken("token-abc");
      const b = AuthService.hashRefreshToken("token-abc");
      expect(a).toBe(b);
      expect(a).toHaveLength(64); // sha256 hex
    });
  });
});
