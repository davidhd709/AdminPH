import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";
import { PqrService } from "./pqr.service";
import { CreatePqrDto, PqrQueryDto, RespondPqrDto, UpdatePqrStatusDto } from "./dto/pqr.dto";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { Roles } from "../../core/decorators/roles.decorator";
import { AuthUser } from "../../core/types/auth-user";

@ApiTags("pqr")
@ApiBearerAuth()
@Controller("pqr")
export class PqrController {
  constructor(private readonly pqrService: PqrService) {}

  @Post()
  create(@Body() dto: CreatePqrDto, @CurrentUser() user: AuthUser, @Req() request: ExpressRequest) {
    return this.pqrService.create(dto, user, request);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: PqrQueryDto) {
    return this.pqrService.findAll(user, query, query);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.pqrService.findOne(id, user);
  }

  @Patch(":id/status")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdatePqrStatusDto,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.pqrService.updateStatus(id, dto, user, request);
  }

  @Post(":id/responses")
  respond(
    @Param("id") id: string,
    @Body() dto: RespondPqrDto,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.pqrService.respond(id, dto, user, request);
  }
}
