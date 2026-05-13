import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { JwtAuthGuard } from "../../core/guards/jwt-auth.guard";
import { RolesGuard } from "../../core/guards/roles.guard";
import { Roles } from "../../core/decorators/roles.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { Request as ExpressRequest } from "express";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
  async remove(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Req() request: ExpressRequest,
  ) {
    return this.usersService.delete(id, user, request);
  }
}
