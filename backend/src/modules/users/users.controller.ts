import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateMeDto } from "./dto/update-me.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { AuthService } from "../auth/auth.service";
import { AuditService } from "../audit/audit.service";
import { Roles } from "../../core/decorators/roles.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { AuthUser } from "../../core/types/auth-user";

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @Roles("SUPERADMIN", "COMPANY_ADMIN")
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: any,
    @Req() request: ExpressRequest,
  ) {
    return this.usersService.create(dto, user, request);
  }

  @Get("me")
  async getMe(@CurrentUser() user: any) {
    return this.usersService.findOne(user.sub, user);
  }

  @Patch("me")
  async updateMe(
    @Body() dto: UpdateMeDto,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.usersService.updateMe(user.sub, dto, request);
  }

  /**
   * Cambia la propia contraseña y revoca todas las sesiones (refresh tokens)
   * para forzar re-login en todos los dispositivos.
   */
  @Post("me/change-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ): Promise<void> {
    await this.usersService.changePassword(user.sub, dto.oldPassword, dto.newPassword, request);
    await this.authService.revokeAllUserTokens(user.sub);
  }

  @Patch(":id")
  @Roles("SUPERADMIN", "COMPANY_ADMIN")
  async update(
    @Param("id") id: string,
    @Body() dto: any,
    @CurrentUser() user: any,
    @Req() request: ExpressRequest,
  ) {
    return this.usersService.update(id, dto, user, request);
  }

  @Delete(":id")
  @Roles("SUPERADMIN")
  async remove(@Param("id") id: string, @CurrentUser() user: any, @Req() request: ExpressRequest) {
    return this.usersService.delete(id, user, request);
  }

  /**
   * Desbloquea una cuenta bloqueada por intentos fallidos. Audit con
   * action=UPDATE y entityName=UserLockout.
   */
  @Post(":id/unlock")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles("SUPERADMIN", "COMPANY_ADMIN")
  async unlock(
    @Param("id") id: string,
    @CurrentUser() current: AuthUser,
    @Req() request: ExpressRequest,
  ): Promise<void> {
    const target = await this.usersService.findOne(id, current);
    await this.authService.unlockUser(target.id);
    await this.auditService.log({
      userId: current.sub,
      companyId: target.companyId,
      entityName: "UserLockout",
      entityId: target.id,
      action: "UPDATE",
      newValue: { unlockedBy: current.sub, unlockedAt: new Date().toISOString() },
      request,
    });
  }
}
