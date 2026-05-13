import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from "@nestjs/common";
import { UnitsService } from "./units.service";
import { CreateUnitDto, UpdateUnitDto } from "./dto/unit.dto";
import { JwtAuthGuard } from "../../core/guards/jwt-auth.guard";
import { RolesGuard } from "../../core/guards/roles.guard";
import { Roles } from "../../core/decorators/roles.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { Request as ExpressRequest } from "express";

@Controller("units")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async create(
    @Body() dto: CreateUnitDto,
    @CurrentUser() user: any,
    @Req() request: ExpressRequest,
  ) {
    return this.unitsService.create(dto, user, request);
  }

  @Get()
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async findAll(@CurrentUser() user: any, @Param("propertyId") propertyId: string) {
    return this.unitsService.findAll(user, propertyId);
  }

  @Get(":id")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.unitsService.findOne(id, user);
  }

  @Patch(":id")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateUnitDto,
    @CurrentUser() user: any,
    @Req() request: ExpressRequest,
  ) {
    return this.unitsService.update(id, dto, user, request);
  }

  @Delete(":id")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async remove(@Param("id") id: string, @CurrentUser() user: any, @Req() request: ExpressRequest) {
    return this.unitsService.remove(id, user, request);
  }
}
