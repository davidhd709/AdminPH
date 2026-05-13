import { Controller, Post, Get, Patch, Body, Param, UseGuards } from "@nestjs/common";
import type { LateFeeService } from "./late-fee.service";
import type { CreateLateFeeConfigDto} from "./dto/late-fee.dto";
import { UpdateLateFeeConfigDto } from "./dto/late-fee.dto";
import { JwtAuthGuard } from "../../core/guards/jwt-auth.guard";
import { RolesGuard } from "../../core/guards/roles.guard";
import { Roles } from "../../core/decorators/roles.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";

@Controller("finance/late-fees")
@UseGuards(JwtAuthGuard, RolesGuard)
export class LateFeeController {
  constructor(private readonly lateFeeService: LateFeeService) {}

  @Post("config")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN", "ACCOUNTANT")
  async setConfig(
    @Body() dto: CreateLateFeeConfigDto,
    @CurrentUser() user: any,
    @Body("request") request: any,
  ) {
    return this.lateFeeService.createConfig(dto, user, request);
  }

  @Get("config/:propertyId")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN", "ACCOUNTANT")
  async getConfig(@Param("propertyId") propertyId: string, @CurrentUser() user: any) {
    return this.lateFeeService.getConfig(propertyId, user);
  }

  @Post("calculate/:propertyId")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN", "ACCOUNTANT")
  async calculate(
    @Param("propertyId") propertyId: string,
    @CurrentUser() user: any,
    @Body("request") request: any,
  ) {
    return this.lateFeeService.calculateAndGenerateInterest(propertyId, user, request);
  }
}
