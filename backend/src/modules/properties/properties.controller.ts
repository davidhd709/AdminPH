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
import { PropertiesService } from "./properties.service";
import { CreatePropertyDto, UpdatePropertyDto } from "./dto/property.dto";
import { JwtAuthGuard } from "../../core/guards/jwt-auth.guard";
import { RolesGuard } from "../../core/guards/roles.guard";
import { Roles } from "../../core/decorators/roles.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { Request as ExpressRequest } from "express";

@Controller("properties")
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @Roles("SUPERADMIN", "COMPANY_ADMIN")
  async create(
    @Body() dto: CreatePropertyDto,
    @CurrentUser() user: any,
    @Req() request: ExpressRequest,
  ) {
    return this.propertiesService.create(dto, user, request);
  }

  @Get()
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async findAll(@CurrentUser() user: any) {
    return this.propertiesService.findAll(user);
  }

  @Get(":id")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.propertiesService.findOne(id, user);
  }

  @Patch(":id")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdatePropertyDto,
    @CurrentUser() user: any,
    @Req() request: ExpressRequest,
  ) {
    return this.propertiesService.update(id, dto, user, request);
  }

  @Delete(":id")
  @Roles("SUPERADMIN", "COMPANY_ADMIN")
  async remove(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Req() request: ExpressRequest,
  ) {
    return this.propertiesService.remove(id, user, request);
  }
}
