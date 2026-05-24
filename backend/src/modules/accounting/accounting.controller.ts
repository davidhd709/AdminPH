import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";
import { AccountingService } from "./accounting.service";
import {
  CreateBankAccountDto,
  CreateBudgetDto,
  CreateCategoryDto,
  CreateTransactionDto,
  TransactionQueryDto,
} from "./dto/accounting.dto";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { Roles } from "../../core/decorators/roles.decorator";
import { PaginationDto } from "../../core/dto/pagination.dto";
import { AuthUser } from "../../core/types/auth-user";

@ApiTags("accounting")
@ApiBearerAuth()
@Controller("accounting")
@Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN", "ACCOUNTANT")
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // ===== BankAccount =====

  @Post("bank-accounts")
  createBankAccount(@Body() dto: CreateBankAccountDto, @CurrentUser() user: AuthUser) {
    return this.accountingService.createBankAccount(dto, user);
  }

  @Get("bank-accounts")
  listBankAccounts(
    @CurrentUser() user: AuthUser,
    @Query("propertyId") propertyId: string | undefined,
    @Query() pagination: PaginationDto,
  ) {
    return this.accountingService.listBankAccounts(user, propertyId, pagination);
  }

  // ===== Category =====

  @Post("categories")
  createCategory(@Body() dto: CreateCategoryDto, @CurrentUser() user: AuthUser) {
    return this.accountingService.createCategory(dto, user);
  }

  @Get("categories")
  listCategories(
    @CurrentUser() user: AuthUser,
    @Query("propertyId") propertyId: string | undefined,
    @Query() pagination: PaginationDto,
  ) {
    return this.accountingService.listCategories(user, propertyId, pagination);
  }

  // ===== Transaction =====

  @Post("transactions")
  createTransaction(
    @Body() dto: CreateTransactionDto,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.accountingService.createTransaction(dto, user, request);
  }

  @Get("transactions")
  listTransactions(
    @CurrentUser() user: AuthUser,
    @Query() query: TransactionQueryDto,
    @Query() pagination: PaginationDto,
  ) {
    return this.accountingService.listTransactions(user, query, pagination);
  }

  @Delete("transactions/:id")
  removeTransaction(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.accountingService.removeTransaction(id, user, request);
  }

  // ===== Budget =====

  @Post("budgets")
  createBudget(
    @Body() dto: CreateBudgetDto,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.accountingService.createBudget(dto, user, request);
  }

  @Get("budgets/:propertyId/:year/execution")
  getBudgetExecution(
    @Param("propertyId") propertyId: string,
    @Param("year", ParseIntPipe) year: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.accountingService.getBudgetExecution(propertyId, year, user);
  }

  // ===== Reportes =====

  @Get("reports/income-expense")
  reportIncomeExpense(
    @CurrentUser() user: AuthUser,
    @Query("propertyId") propertyId: string,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    return this.accountingService.reportIncomeExpense(propertyId, from, to, user);
  }
}
