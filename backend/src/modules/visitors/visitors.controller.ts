import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";
import { VisitorsService } from "./visitors.service";
import { CreateVisitorDto, VisitorQueryDto } from "./dto/visitor.dto";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { Roles } from "../../core/decorators/roles.decorator";
import { AuthUser } from "../../core/types/auth-user";

@ApiTags("visitors")
@ApiBearerAuth()
@Controller("visitors")
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  @Post()
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN", "SECURITY")
  register(
    @Body() dto: CreateVisitorDto,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.visitorsService.register(dto, user, request);
  }

  @Patch(":id/exit")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN", "SECURITY")
  registerExit(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.visitorsService.registerExit(id, user, request);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: VisitorQueryDto) {
    return this.visitorsService.findAll(user, query, query);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.visitorsService.findOne(id, user);
  }
}
