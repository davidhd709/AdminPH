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
import { AuthService, RefreshTokenExpiredError, RefreshTokenReuseError } from "./auth.service";
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
    private readonly auditService: AuditService,
  ) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() request: Request) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user) {
      await this.logFailedLoginIfUserExists(dto.email, request);
      throw new UnauthorizedException("Invalid credentials");
    }

    const tokens = await this.authService.issueTokens(user, request);

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
   * Rotación: cada refresh emite un par nuevo y revoca el anterior. Si el
   * token enviado ya estaba revocado (reuso) o no existe, se revocan TODOS
   * los refresh tokens del usuario y se rechaza el request.
   */
  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto, @Req() request: Request) {
    try {
      return await this.authService.rotateRefreshToken(dto.refresh_token, request);
    } catch (err) {
      if (err instanceof RefreshTokenReuseError) {
        throw new UnauthorizedException("Refresh token revoked. Re-login required.");
      }
      if (err instanceof RefreshTokenExpiredError) {
        throw new UnauthorizedException("Refresh token expired. Re-login required.");
      }
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: AuthUser, @Req() request: Request) {
    await this.authService.revokeAllUserTokens(user.sub);
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
