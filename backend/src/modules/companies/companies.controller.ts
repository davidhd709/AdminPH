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
import { CompaniesService } from "./companies.service";
import { CreateCompanyDto, UpdateCompanyDto } from "./dto/company.dto";
import { JwtAuthGuard } from "../../core/guards/jwt-auth.guard";
import { RolesGuard } from "../../core/guards/roles.guard";
import { Roles } from "../../core/decorators/roles.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { Request as ExpressRequest } from "express";

@Controller("companies")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Roles("SUPERADMIN")
  async create(
    @Body() dto: CreateCompanyDto,
    @CurrentUser() user: any,
    @Req() request: ExpressRequest,
  ) {
    return this.companiesService.create(dto, user, request);
  }

  @Get()
  @Roles("SUPERADMIN", "COMPANY_ADMIN")
  async findAll(@CurrentUser() user: any) {
    return this.companiesService.findAll(user);
  }

  @Get(":id")
  @Roles("SUPERADMIN", "COMPANY_ADMIN")
  async findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.companiesService.findOne(id, user);
  }

  @Patch(":id")
  @Roles("SUPERADMIN", "COMPANY_ADMIN")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: any,
    @Req() request: ExpressRequest,
  ) {
    return this.companiesService.update(id, dto, user, request);
  }

  @Delete(":id")
  @Roles("SUPERADMIN")
  async remove(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Req() request: ExpressRequest,
  ) {
    return this.companiesService.remove(id, user, request);
  }
}
