import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";
import { FeeConceptsService } from "./fee-concepts.service";
import {
  CreateFeeConceptDto,
  FeeConceptQueryDto,
  UpdateFeeConceptDto,
} from "./dto/fee-concept.dto";
import { JwtAuthGuard } from "../../core/guards/jwt-auth.guard";
import { RolesGuard } from "../../core/guards/roles.guard";
import { Roles } from "../../core/decorators/roles.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";

/**
 * Conceptos de cobro por copropiedad (administración, extraordinaria, multas…).
 * Expone el FeeConceptsService (que ya existía sin controller). El listado va
 * acotado a una copropiedad (propertyId por query).
 */
@ApiTags("fee-concepts")
@ApiBearerAuth()
@Controller("finance/fee-concepts")
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeeConceptsController {
  constructor(private readonly service: FeeConceptsService) {}

  @Post()
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async create(
    @Body() dto: CreateFeeConceptDto,
    @CurrentUser() user: any,
    @Req() request: ExpressRequest,
  ) {
    return this.service.create(dto, user, request);
  }

  @Get()
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async findAll(@CurrentUser() user: any, @Query() query: FeeConceptQueryDto) {
    return this.service.findAll(user, query.propertyId);
  }

  @Get(":id")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }

  @Patch(":id")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateFeeConceptDto,
    @CurrentUser() user: any,
    @Req() request: ExpressRequest,
  ) {
    return this.service.update(id, dto, user, request);
  }

  @Delete(":id")
  @Roles("SUPERADMIN", "COMPANY_ADMIN")
  async remove(@Param("id") id: string, @CurrentUser() user: any, @Req() request: ExpressRequest) {
    return this.service.remove(id, user, request);
  }
}
