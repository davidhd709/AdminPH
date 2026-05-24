import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { CompaniesService } from "./companies.service";
import { CreateCompanyDto, UpdateCompanyDto } from "./dto/company.dto";
import { Roles } from "../../core/decorators/roles.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { PaginationDto } from "../../core/dto/pagination.dto";
import { Request as ExpressRequest } from "express";

@Controller("companies")
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
  async findAll(@CurrentUser() user: any, @Query() pagination: PaginationDto) {
    return this.companiesService.findAll(user, pagination);
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
  async remove(@Param("id") id: string, @CurrentUser() user: any, @Req() request: ExpressRequest) {
    return this.companiesService.remove(id, user, request);
  }
}
