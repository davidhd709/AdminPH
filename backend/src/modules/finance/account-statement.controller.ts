import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { AccountStatementService } from "./account-statement.service";
import { JwtAuthGuard } from "../../core/guards/jwt-auth.guard";
import { RolesGuard } from "../../core/guards/roles.guard";
import { Roles } from "../../core/decorators/roles.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";

@Controller("finance/statement")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountStatementController {
  constructor(private readonly statementService: AccountStatementService) {}

  @Get(":unitId")
  @Roles(
    "SUPERADMIN",
    "COMPANY_ADMIN",
    "PROPERTY_ADMIN",
    "ACCOUNTANT",
    "OWNER",
    "RESIDENT",
  )
  async getStatement(
    @Param("unitId") unitId: string,
    @CurrentUser() user: any,
  ) {
    return this.statementService.getStatement(unitId, user);
  }

  @Get("paz-y-salvo/:unitId")
  @Roles(
    "SUPERADMIN",
    "COMPANY_ADMIN",
    "PROPERTY_ADMIN",
    "ACCOUNTANT",
    "OWNER",
    "RESIDENT",
  )
  async getPazYSalvo(
    @Param("unitId") unitId: string,
    @CurrentUser() user: any,
  ) {
    return this.statementService.validatePazYSalvo(unitId, user);
  }
}
