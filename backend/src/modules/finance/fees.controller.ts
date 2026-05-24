import { Controller, Post, Get, Patch, Body, Query, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { FeesService } from "./fees.service";
import { GenerateFeesDto, FeeQueryDto } from "./dto/fees.dto";
import { JwtAuthGuard } from "../../core/guards/jwt-auth.guard";
import { RolesGuard } from "../../core/guards/roles.guard";
import { Roles } from "../../core/decorators/roles.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";

@ApiTags("fees")
@ApiBearerAuth()
@Controller("finance/fees")
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Post("generate")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN", "ACCOUNTANT")
  async generate(
    @Body() dto: GenerateFeesDto,
    @CurrentUser() user: any,
    @Body("request") request: any,
  ) {
    return this.feesService.generateMassFees(dto, user, request);
  }

  @Get()
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN", "ACCOUNTANT", "OWNER", "RESIDENT")
  async findAll(@Query() query: FeeQueryDto, @CurrentUser() user: any) {
    return this.feesService.findAll(user, query, query);
  }

  @Get(":id")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN", "ACCOUNTANT", "OWNER", "RESIDENT")
  async findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.feesService.findOne(id, user);
  }

  @Patch(":id/cancel")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN", "ACCOUNTANT")
  async cancel(@Param("id") id: string, @CurrentUser() user: any, @Body("request") request: any) {
    return this.feesService.cancelFee(id, user, request);
  }
}
