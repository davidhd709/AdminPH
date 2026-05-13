import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Company } from "@prisma/client";
import { CreateCompanyDto, UpdateCompanyDto } from "./dto/company.dto";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class CompaniesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateCompanyDto, user: any, request: any): Promise<Company> {
    const company = await this.prisma.company.create({
      data: dto,
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: company.id,
      entityName: "Company",
      entityId: company.id,
      action: "CREATE",
      newValue: company,
      request,
    });

    return company;
  }

  async findAll(user: any): Promise<Company[]> {
    const where: any = { deletedAt: null };

    if (user.role !== "SUPERADMIN") {
      where.id = user.companyId;
    }

    return this.prisma.company.findMany({
      where,
    });
  }

  async findOne(id: string, user: any): Promise<Company | null> {
    if (user.role !== "SUPERADMIN" && user.companyId !== id) {
      throw new ForbiddenException("Access denied to this company");
    }

    return this.prisma.company.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async update(id: string, dto: UpdateCompanyDto, user: any, request: any): Promise<Company> {
    if (user.role !== "SUPERADMIN" && user.companyId !== id) {
      throw new ForbiddenException("Access denied to update this company");
    }

    const oldCompany = await this.findOne(id, user);
    if (!oldCompany) throw new NotFoundException("Company not found");

    const updated = await this.prisma.company.update({
      where: { id },
      data: dto,
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: id,
      entityName: "Company",
      entityId: id,
      action: "UPDATE",
      oldValue: oldCompany,
      newValue: updated,
      request,
    });

    return updated;
  }

  async remove(id: string, user: any, request: any): Promise<Company> {
    if (user.role !== "SUPERADMIN") {
      throw new ForbiddenException("Only Superadmin can delete companies");
    }

    const oldCompany = await this.findOne(id, user);
    if (!oldCompany) throw new NotFoundException("Company not found");

    const deleted = await this.prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: id,
      entityName: "Company",
      entityId: id,
      action: "DELETE",
      oldValue: oldCompany,
      newValue: deleted,
      request,
    });

    return deleted;
  }
}
