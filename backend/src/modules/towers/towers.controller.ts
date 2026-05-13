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
import { TowersService } from "./towers.service";
import { CreateTowerDto, UpdateTowerDto } from "./dto/tower.dto";
import { JwtAuthGuard } from "../../core/guards/jwt-auth.guard";
import { RolesGuard } from "../../core/guards/roles.guard";
import { Roles } from "../../core/decorators/roles.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { Request as ExpressRequest } from "express";

@Controller("towers")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TowersController {
  constructor(private readonly towersService: TowersService) {}

  @Post()
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async create(
    @Body() dto: CreateTowerDto,
    @CurrentUser() user: any,
    @Req() request: ExpressRequest,
  ) {
    return this.towersService.create(dto, user, request);
  }

  @Get()
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async findAll(
    @CurrentUser() user: any,
    @Param("propertyId") propertyId: string,
  ) {
    return this.towersService.findAll(user, propertyId);
  }

  @Get(":id")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.towersService.findOne(id, user);
  }

  @Patch(":id")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateTowerDto,
    @CurrentUser() user: any,
    @Req() request: ExpressRequest,
  ) {
    return this.towersService.update(id, dto, user, request);
  }

  @Delete(":id")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async remove(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Req() request: ExpressRequest,
  ) {
    return this.towersService.remove(id, user, request);
  }
}
