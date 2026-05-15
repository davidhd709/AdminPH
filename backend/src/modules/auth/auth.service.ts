import { createHash } from "crypto";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { RefreshToken, User } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ===== Password helpers =====

  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // ===== User lookups =====

  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (!user) return null;
    const isMatch = await this.comparePassword(pass, user.password);
    if (!isMatch) return null;
    return user;
  }

  getUserById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { email, deletedAt: null } });
  }

  // ===== JWT issuance =====

  /**
   * Genera un par access + refresh y registra el refresh token (hasheado)
   * en BD. Retorna los tokens en claro para que el cliente los guarde.
   */
  async issueTokens(user: User, request?: Request): Promise<TokenPair> {
    const tokens = this.signTokenPair(user);
    await this.persistRefreshToken(user.id, tokens.refresh_token, request);
    return tokens;
  }

  /**
   * Rotación: valida el refresh token incoming, revoca el existente, emite
   * uno nuevo. Si el refresh token JWT es válido pero NO existe (o ya está
   * revocado) en BD, asume reuso/robo y revoca TODOS los del usuario.
   */
  async rotateRefreshToken(refreshTokenJwt: string, request?: Request): Promise<TokenPair> {
    type Payload = { sub: string; email: string };
    const payload = await this.jwtService.verifyAsync<Payload>(refreshTokenJwt, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    const hash = AuthService.hashRefreshToken(refreshTokenJwt);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
    });

    if (!existing) {
      // JWT válido pero el hash no está en BD: el token nunca existió o ya fue
      // borrado físicamente. Comportamiento conservador: revocar todos.
      await this.revokeAllUserTokens(payload.sub);
      throw new RefreshTokenReuseError();
    }

    if (existing.revokedAt) {
      // Token ya revocado pero el cliente lo reusa => posible robo.
      await this.revokeAllUserTokens(existing.userId);
      throw new RefreshTokenReuseError();
    }

    if (existing.expiresAt < new Date()) {
      throw new RefreshTokenExpiredError();
    }

    const user = await this.getUserById(existing.userId);
    if (!user) throw new RefreshTokenReuseError();

    // Marca el viejo como revocado y emite uno nuevo.
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(user, request);
  }

  /**
   * Revoca todos los refresh tokens del usuario (logout total). No revoca
   * los que ya estaban revocados.
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * @deprecated Reemplazado por revokeAllUserTokens. Mantenido como wrapper
   * porque el controller lo usa con el nombre `logout`.
   */
  logout(userId: string): Promise<void> {
    return this.revokeAllUserTokens(userId);
  }

  // ===== Private helpers =====

  private signTokenPair(user: User): TokenPair {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.globalRole,
      companyId: user.companyId,
    };
    const access_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN as any,
    });
    const refresh_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN as any,
    });
    return { access_token, refresh_token };
  }

  private async persistRefreshToken(
    userId: string,
    refreshToken: string,
    request?: Request,
  ): Promise<RefreshToken> {
    const hash = AuthService.hashRefreshToken(refreshToken);
    const expiresAt = AuthService.computeExpiry(process.env.JWT_REFRESH_EXPIRES_IN);
    const ctx = AuthService.extractRequestContext(request);
    return this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hash,
        expiresAt,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    });
  }

  static hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  /**
   * Convierte la string de env (`15m`, `7d`, `3600s`) a un Date futuro.
   * Si no se puede parsear, default 7 días.
   */
  private static computeExpiry(envValue: string | undefined): Date {
    const now = Date.now();
    if (!envValue) return new Date(now + 7 * 24 * 60 * 60 * 1000);
    const match = /^(\d+)([smhd])$/.exec(envValue.trim());
    if (!match) return new Date(now + 7 * 24 * 60 * 60 * 1000);
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const factor =
      unit === "s"
        ? 1000
        : unit === "m"
          ? 60 * 1000
          : unit === "h"
            ? 60 * 60 * 1000
            : 24 * 60 * 60 * 1000;
    return new Date(now + value * factor);
  }

  private static extractRequestContext(request?: Request): {
    ipAddress?: string;
    userAgent?: string;
  } {
    if (!request) return {};
    const headers = (request.headers ?? {}) as Record<string, string | string[] | undefined>;
    const xff = headers["x-forwarded-for"];
    const forwarded = Array.isArray(xff) ? xff[0] : xff;
    const ipAddress = forwarded?.split(",")[0]?.trim() || request.ip || undefined;
    const ua = headers["user-agent"];
    const userAgent = Array.isArray(ua) ? ua[0] : ua;
    return { ipAddress, userAgent };
  }
}

export class RefreshTokenReuseError extends Error {
  constructor() {
    super("Refresh token reuse detected; all sessions revoked");
  }
}

export class RefreshTokenExpiredError extends Error {
  constructor() {
    super("Refresh token expired");
  }
}
