import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BankAccount, AccountingCategory, Transaction, TransactionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PaginatedResult, PaginationDto } from "../../core/dto/pagination.dto";
import { paginate } from "../../core/utils/paginate";
import { AuthUser } from "../../core/types/auth-user";
import {
  CreateBankAccountDto,
  CreateBudgetDto,
  CreateCategoryDto,
  CreateTransactionDto,
  TransactionQueryDto,
} from "./dto/accounting.dto";

/**
 * Roles con potestad financiera. La contabilidad administrativa es información
 * sensible: OWNER y RESIDENT NO acceden a este módulo.
 */
const FINANCIAL_ROLES = ["SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN", "ACCOUNTANT"];

/** Una fila de la ejecución presupuestal: planeado vs ejecutado por categoría. */
export interface BudgetExecutionRow {
  categoryId: string;
  categoryName: string;
  type: TransactionType;
  planned: number;
  executed: number;
  variance: number;
}

export interface IncomeExpenseReport {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

@Injectable()
export class AccountingService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ===== BankAccount =====

  async createBankAccount(dto: CreateBankAccountDto, user: AuthUser): Promise<BankAccount> {
    this.assertFinancialRole(user);
    const property = await this.getProperty(dto.propertyId);
    await this.assertPropertyAccess(user, property.id, property.companyId);

    return this.prisma.bankAccount.create({
      data: {
        companyId: property.companyId,
        propertyId: property.id,
        name: dto.name,
        bank: dto.bank,
        accountNumber: dto.accountNumber,
      },
    });
  }

  async listBankAccounts(
    user: AuthUser,
    propertyId: string | undefined,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<BankAccount>> {
    this.assertFinancialRole(user);
    const where = await this.buildScopeWhere(user, propertyId);
    return paginate<BankAccount>(this.prisma.bankAccount, where, pagination);
  }

  // ===== Category =====

  async createCategory(dto: CreateCategoryDto, user: AuthUser): Promise<AccountingCategory> {
    this.assertFinancialRole(user);
    const property = await this.getProperty(dto.propertyId);
    await this.assertPropertyAccess(user, property.id, property.companyId);

    return this.prisma.accountingCategory.create({
      data: {
        companyId: property.companyId,
        propertyId: property.id,
        name: dto.name,
        type: dto.type,
      },
    });
  }

  async listCategories(
    user: AuthUser,
    propertyId: string | undefined,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<AccountingCategory>> {
    this.assertFinancialRole(user);
    const where = await this.buildScopeWhere(user, propertyId);
    return paginate<AccountingCategory>(this.prisma.accountingCategory, where, pagination);
  }

  // ===== Transaction =====

  async createTransaction(
    dto: CreateTransactionDto,
    user: AuthUser,
    request: unknown,
  ): Promise<Transaction> {
    this.assertFinancialRole(user);
    const property = await this.getProperty(dto.propertyId);
    await this.assertPropertyAccess(user, property.id, property.companyId);

    if (dto.bankAccountId) {
      const account = await this.prisma.bankAccount.findFirst({
        where: { id: dto.bankAccountId, propertyId: property.id, deletedAt: null },
      });
      if (!account) throw new NotFoundException("Bank account not found in this property");
    }

    if (dto.categoryId) {
      const category = await this.prisma.accountingCategory.findFirst({
        where: { id: dto.categoryId, propertyId: property.id, deletedAt: null },
      });
      if (!category) throw new NotFoundException("Category not found in this property");
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        companyId: property.companyId,
        propertyId: property.id,
        bankAccountId: dto.bankAccountId ?? null,
        categoryId: dto.categoryId ?? null,
        createdById: user.sub,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        date: new Date(dto.date),
      },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: property.companyId,
      propertyId: property.id,
      entityName: "Transaction",
      entityId: transaction.id,
      action: "CREATE",
      newValue: transaction,
      request,
    });

    return transaction;
  }

  async listTransactions(
    user: AuthUser,
    query: TransactionQueryDto,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Transaction>> {
    this.assertFinancialRole(user);
    const where = await this.buildScopeWhere(user, query.propertyId);
    if (query.type) where.type = query.type;
    if (query.categoryId) where.categoryId = query.categoryId;

    return paginate<Transaction>(this.prisma.transaction, where, pagination, {
      defaultSortBy: "date",
    });
  }

  async removeTransaction(id: string, user: AuthUser, request: unknown): Promise<Transaction> {
    this.assertFinancialRole(user);
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, deletedAt: null },
    });
    if (!transaction) throw new NotFoundException("Transaction not found");
    await this.assertPropertyAccess(user, transaction.propertyId, transaction.companyId);

    const deleted = await this.prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: transaction.companyId,
      propertyId: transaction.propertyId,
      entityName: "Transaction",
      entityId: id,
      action: "DELETE",
      oldValue: transaction,
      request,
    });

    return deleted;
  }

  // ===== Budget =====

  async createBudget(dto: CreateBudgetDto, user: AuthUser, request: unknown) {
    this.assertFinancialRole(user);
    const property = await this.getProperty(dto.propertyId);
    await this.assertPropertyAccess(user, property.id, property.companyId);

    const existing = await this.prisma.budget.findFirst({
      where: { propertyId: property.id, year: dto.year, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`A budget for ${dto.year} already exists for this property`);
    }

    // Valida que las categorías de los ítems pertenezcan a la property.
    const items = dto.items ?? [];
    if (items.length > 0) {
      const categoryIds = items.map((i) => i.categoryId);
      const found = await this.prisma.accountingCategory.findMany({
        where: { id: { in: categoryIds }, propertyId: property.id, deletedAt: null },
        select: { id: true },
      });
      if (found.length !== new Set(categoryIds).size) {
        throw new NotFoundException("One or more categories do not belong to this property");
      }
    }

    const budget = await this.prisma.budget.create({
      data: {
        companyId: property.companyId,
        propertyId: property.id,
        year: dto.year,
        items: {
          create: items.map((i) => ({
            categoryId: i.categoryId,
            plannedAmount: i.plannedAmount,
          })),
        },
      },
      include: { items: true },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: property.companyId,
      propertyId: property.id,
      entityName: "Budget",
      entityId: budget.id,
      action: "CREATE",
      newValue: budget,
      request,
    });

    return budget;
  }

  /**
   * Ejecución presupuestal: compara lo PRESUPUESTADO (BudgetItem.plannedAmount
   * por categoría) contra lo EJECUTADO (suma de Transactions de esa property y
   * año, agrupadas por categoría). variance = planned - executed (positivo =
   * sobró presupuesto; negativo = sobreejecución). Núcleo del módulo.
   */
  async getBudgetExecution(
    propertyId: string,
    year: number,
    user: AuthUser,
  ): Promise<BudgetExecutionRow[]> {
    this.assertFinancialRole(user);
    const property = await this.getProperty(propertyId);
    await this.assertPropertyAccess(user, property.id, property.companyId);

    const budget = await this.prisma.budget.findFirst({
      where: { propertyId: property.id, year, deletedAt: null },
      include: { items: { include: { category: true } } },
    });
    if (!budget) throw new NotFoundException(`No budget found for ${year}`);

    // Ejecutado: suma de montos por categoría dentro del año natural.
    const from = new Date(Date.UTC(year, 0, 1));
    const to = new Date(Date.UTC(year + 1, 0, 1));
    const executedGroups = await this.prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        propertyId: property.id,
        deletedAt: null,
        categoryId: { not: null },
        date: { gte: from, lt: to },
      },
      _sum: { amount: true },
    });

    const executedByCategory = new Map<string, number>();
    for (const group of executedGroups) {
      if (group.categoryId) {
        executedByCategory.set(group.categoryId, Number(group._sum.amount ?? 0));
      }
    }

    return budget.items.map((item) => {
      const planned = Number(item.plannedAmount);
      const executed = executedByCategory.get(item.categoryId) ?? 0;
      return {
        categoryId: item.categoryId,
        categoryName: item.category.name,
        type: item.category.type,
        planned,
        executed,
        variance: planned - executed,
      };
    });
  }

  // ===== Reportes =====

  /**
   * Reporte de ingresos vs egresos en un rango de fechas.
   * balance = totalIncome - totalExpense.
   */
  async reportIncomeExpense(
    propertyId: string,
    from: string,
    to: string,
    user: AuthUser,
  ): Promise<IncomeExpenseReport> {
    this.assertFinancialRole(user);
    const property = await this.getProperty(propertyId);
    await this.assertPropertyAccess(user, property.id, property.companyId);

    const where = {
      propertyId: property.id,
      deletedAt: null,
      date: { gte: new Date(from), lte: new Date(to) },
    };

    const [income, expense] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.INCOME },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.EXPENSE },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = Number(income._sum.amount ?? 0);
    const totalExpense = Number(expense._sum.amount ?? 0);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }

  // ===== Helpers de acceso =====

  /** Lanza Forbidden si el usuario no tiene rol financiero. */
  private assertFinancialRole(user: AuthUser): void {
    if (!FINANCIAL_ROLES.includes(user.role)) {
      throw new ForbiddenException("Financial role required to access accounting");
    }
  }

  private async getProperty(propertyId: string): Promise<{ id: string; companyId: string }> {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
      select: { id: true, companyId: true },
    });
    if (!property) throw new NotFoundException("Property not found");
    return property;
  }

  private async assertPropertyAccess(
    user: AuthUser,
    propertyId: string,
    companyId: string,
  ): Promise<void> {
    if (user.role === "SUPERADMIN") return;
    if (user.role === "COMPANY_ADMIN") {
      if (companyId !== user.companyId) throw new ForbiddenException("Cross-company access denied");
      return;
    }
    const assignment = await this.prisma.propertyUser.findFirst({
      where: { userId: user.sub, propertyId },
    });
    if (!assignment) throw new ForbiddenException("Not assigned to this property");
  }

  private async assignedPropertyIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.propertyUser.findMany({
      where: { userId },
      select: { propertyId: true },
    });
    return rows.map((r) => r.propertyId);
  }

  /**
   * Construye el `where` de listado aplicando scoping por rol financiero:
   * - SUPERADMIN: todo (opcionalmente filtrado por propertyId).
   * - COMPANY_ADMIN: su companyId (opcionalmente filtrado por propertyId).
   * - PROPERTY_ADMIN / ACCOUNTANT: solo sus propiedades asignadas.
   */
  private async buildScopeWhere(
    user: AuthUser,
    propertyId: string | undefined,
  ): Promise<Record<string, unknown>> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (user.role === "SUPERADMIN") {
      if (propertyId) where.propertyId = propertyId;
    } else if (user.role === "COMPANY_ADMIN") {
      where.companyId = user.companyId;
      if (propertyId) where.propertyId = propertyId;
    } else {
      const assigned = await this.assignedPropertyIds(user.sub);
      where.propertyId =
        propertyId && assigned.includes(propertyId) ? propertyId : { in: assigned };
    }

    return where;
  }
}
