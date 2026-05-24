import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiProperty, ApiTags } from "@nestjs/swagger";
import {
  AuthService,
  PasswordResetInvalidError,
  RefreshTokenExpiredError,
  RefreshTokenReuseError,
} from "./auth.service";
import { AuditService } from "../audit/audit.service";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { Public } from "../../core/decorators/public.decorator";
import { AuthUser } from "../../core/types/auth-user";
import { IsStrongPassword } from "../../core/validators/is-strong-password.validator";

class LoginDto {
  @ApiProperty({ description: "Email del usuario", example: "admin@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: "Contraseña del usuario", example: "S3cr3t!Pass" })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

class RefreshDto {
  @ApiProperty({ description: "Refresh token vigente a rotar" })
  @IsString()
  @IsNotEmpty()
  refresh_token!: string;
}

class ForgotPasswordDto {
  @ApiProperty({ description: "Email de la cuenta", example: "admin@example.com" })
  @IsEmail()
  email!: string;
}

class ResetPasswordDto {
  @ApiProperty({ description: "Token recibido por email" })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ description: "Nueva contraseña fuerte", example: "N3w!Str0ngPass" })
  @IsStrongPassword()
  newPassword!: string;
}

@ApiTags("auth")
@ApiBearerAuth()
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @Public()
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() request: Request) {
    const result = await this.authService.validateUser(dto.email, dto.password);

    if (result.kind === "locked") {
      throw new HttpException(
        {
          statusCode: HttpStatus.LOCKED,
          error: "Locked",
          message: "Account is locked due to repeated failed logins. Try again later.",
          lockedUntil: result.until.toISOString(),
        },
        HttpStatus.LOCKED,
      );
    }

    if (result.kind === "invalid") {
      await this.logFailedLoginIfUserExists(dto.email, request);
      throw new UnauthorizedException("Invalid credentials");
    }

    const user = result.user;
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
  @Throttle({ sensitive: { limit: 30, ttl: 60_000 } })
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

  /**
   * Inicia reset de contraseña. Responde 204 SIEMPRE (exista o no el email)
   * para no revelar qué correos están registrados.
   */
  @Public()
  @Throttle({ sensitive: { limit: 30, ttl: 60_000 } })
  @Post("forgot-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.authService.requestPasswordReset(dto.email);
  }

  /**
   * Completa el reset con el token recibido por email. Revoca todas las
   * sesiones activas del usuario.
   */
  @Public()
  @Throttle({ sensitive: { limit: 30, ttl: 60_000 } })
  @Post("reset-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    try {
      await this.authService.resetPassword(dto.token, dto.newPassword);
    } catch (err) {
      if (err instanceof PasswordResetInvalidError) {
        throw new UnauthorizedException("Invalid or expired reset token");
      }
      throw err;
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
