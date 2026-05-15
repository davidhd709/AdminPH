import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
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
  ) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const tokens = await this.authService.generateTokens(user);
    await this.authService.updateRefreshToken(user.id, tokens.refresh_token);

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
  async logout(@CurrentUser() user: AuthUser) {
    await this.authService.logout(user.sub);
    return { message: "Logged out successfully" };
  }
}
