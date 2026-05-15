import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { AuditService } from "../audit/audit.service";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { Public } from "../../core/decorators/public.decorator";
import { AuthUser } from "../../core/types/auth-user";

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refresh_token!: string;
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() request: Request) {
    const user = await this.authService.validateUser(dto.email, dto.password);

    if (!user) {
      // Registro de intento fallido sin userId: usamos un "userId" especial.
      // Nota: AuditLog.userId es NOT NULL en schema, así que solo logueamos
      // si hay user existente con ese email. Para emails desconocidos, se
      // omite el log para no introducir filas con userId fake.
      await this.logFailedLoginIfUserExists(dto.email, request);
      throw new UnauthorizedException("Invalid credentials");
    }

    const tokens = await this.authService.generateTokens(user);
    await this.authService.updateRefreshToken(user.id, tokens.refresh_token);

    await this.auditService.log({
      userId: user.id,
      companyId: user.companyId,
      entityName: "User",
      entityId: user.id,
      action: "LOGIN",
      request,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.globalRole,
      },
    };
  }

  /**
   * Refresh es @Public() porque el access_token puede estar expirado.
   * La autenticación se hace contra el refresh_token verificado en BD.
   */
  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    let payload: AuthUser;
    try {
      payload = await this.jwtService.verifyAsync<AuthUser>(dto.refresh_token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const userEntity = await this.authService.getUserById(payload.sub);
    if (!userEntity || userEntity.refreshToken !== dto.refresh_token) {
      throw new UnauthorizedException("Refresh token revoked or rotated");
    }

    const tokens = await this.authService.generateTokens(userEntity);
    await this.authService.updateRefreshToken(userEntity.id, tokens.refresh_token);

    return tokens;
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: AuthUser, @Req() request: Request) {
    await this.authService.logout(user.sub);
    await this.auditService.log({
      userId: user.sub,
      companyId: user.companyId,
      entityName: "User",
      entityId: user.sub,
      action: "LOGOUT",
      request,
    });
    return { message: "Logged out successfully" };
  }

  /**
   * Solo loguea FAILED_LOGIN si el email corresponde a un usuario existente.
   * Para emails desconocidos no se crea registro (evita filas con userId fake
   * en una columna NOT NULL).
   */
  private async logFailedLoginIfUserExists(email: string, request: Request): Promise<void> {
    const existing = await this.authService.findByEmail(email);
    if (!existing) return;

    await this.auditService.log({
      userId: existing.id,
      companyId: existing.companyId,
      entityName: "User",
      entityId: existing.id,
      action: "FAILED_LOGIN",
      request,
    });
  }
}
