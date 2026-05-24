import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PeopleService } from "./people.service";
import { CreateOwnerDto, CreateResidentDto } from "./dto/people.dto";
import { JwtAuthGuard } from "../../core/guards/jwt-auth.guard";
import { RolesGuard } from "../../core/guards/roles.guard";
import { Roles } from "../../core/decorators/roles.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { Request as ExpressRequest } from "express";

@ApiTags("people")
@ApiBearerAuth()
@Controller("people")
@UseGuards(JwtAuthGuard, RolesGuard)
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Post("owners")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async createOwner(
    @Body() dto: CreateOwnerDto,
    @CurrentUser() user: any,
    @Req() request: ExpressRequest,
  ) {
    return this.peopleService.createOwner(dto, user, request);
  }

  @Get("owners/:unitId")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async getOwners(@Param("unitId") unitId: string, @CurrentUser() user: any) {
    return this.peopleService.findOwnersByUnit(unitId, user);
  }

  @Delete("owners/:id")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async removeOwner(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Req() request: ExpressRequest,
  ) {
    return this.peopleService.removeOwner(id, user, request);
  }

  @Post("residents")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async createResident(
    @Body() dto: CreateResidentDto,
    @CurrentUser() user: any,
    @Req() request: ExpressRequest,
  ) {
    return this.peopleService.createResident(dto, user, request);
  }

  @Get("residents/:unitId")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async getResidents(@Param("unitId") unitId: string, @CurrentUser() user: any) {
    return this.peopleService.findResidentsByUnit(unitId, user);
  }

  @Delete("residents/:id")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async removeResident(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Req() request: ExpressRequest,
  ) {
    return this.peopleService.removeResident(id, user, request);
  }
}
