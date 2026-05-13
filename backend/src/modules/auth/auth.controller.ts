import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "../../core/guards/jwt-auth.guard";
import { CurrentUser } from "../../core/decorators/current-user.decorator";

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
  constructor(private readonly authService: AuthService) {}

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

  @UseGuards(JwtAuthGuard)
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto, @CurrentUser() user: any) {
    // In a real scenario, we would verify the refresh token against the DB
    // and check if it's expired or revoked.
    const userEntity = await this.authService.prisma.user.findUnique({
      where: { id: user.sub },
    });

    if (!userEntity || userEntity.refreshToken !== dto.refresh_token) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const tokens = await this.authService.generateTokens(userEntity);
    await this.authService.updateRefreshToken(userEntity.id, tokens.refresh_token);

    return tokens;
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: any) {
    await this.authService.prisma.user.update({
      where: { id: user.sub },
      data: { refreshToken: null },
    });
    return { message: "Logged out successfully" };
  }
}
