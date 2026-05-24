import { Body, Controller, Delete, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";
import { RegistryService } from "./registry.service";
import { CreatePetDto, CreateVehicleDto, RegistryQueryDto } from "./dto/registry.dto";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { PaginationDto } from "../../core/dto/pagination.dto";
import { AuthUser } from "../../core/types/auth-user";

@ApiTags("registry")
@ApiBearerAuth()
@Controller("registry")
export class RegistryController {
  constructor(private readonly registryService: RegistryService) {}

  // ===== Pets =====

  @Post("pets")
  createPet(
    @Body() dto: CreatePetDto,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.registryService.createPet(dto, user, request);
  }

  @Get("pets")
  listPets(
    @CurrentUser() user: AuthUser,
    @Query() query: RegistryQueryDto,
    @Query() pagination: PaginationDto,
  ) {
    return this.registryService.listPets(user, query, pagination);
  }

  @Delete("pets/:id")
  removePet(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.registryService.removePet(id, user, request);
  }

  // ===== Vehicles =====

  @Post("vehicles")
  createVehicle(
    @Body() dto: CreateVehicleDto,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.registryService.createVehicle(dto, user, request);
  }

  @Get("vehicles")
  listVehicles(
    @CurrentUser() user: AuthUser,
    @Query() query: RegistryQueryDto,
    @Query() pagination: PaginationDto,
  ) {
    return this.registryService.listVehicles(user, query, pagination);
  }

  @Delete("vehicles/:id")
  removeVehicle(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.registryService.removeVehicle(id, user, request);
  }
}
