import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Workbook } from "exceljs";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../../core/types/auth-user";

@Injectable()
export class ExcelService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cartera (portfolio) de una copropiedad: por unidad, total pendiente y en mora.
   * Solo roles con acceso financiero a la property.
   */
  async portfolio(propertyId: string, user: AuthUser): Promise<Buffer> {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
    });
    if (!property) throw new NotFoundException("Property not found");

    await this.assertAccess(user, property.id, property.companyId);

    const units = await this.prisma.unit.findMany({
      where: { propertyId, deletedAt: null },
      include: {
        tower: true,
        fees: { where: { deletedAt: null, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } } },
      },
      orderBy: { code: "asc" },
    });

    const wb = new Workbook();
    wb.creator = "AdminPH";
    const sheet = wb.addWorksheet("Cartera");
    sheet.columns = [
      { header: "Unidad", key: "code", width: 14 },
      { header: "Torre", key: "tower", width: 16 },
      { header: "Cuotas pendientes", key: "count", width: 18 },
      { header: "Total pendiente", key: "pending", width: 18 },
      { header: "En mora", key: "overdue", width: 16 },
    ];
    sheet.getRow(1).font = { bold: true };

    const now = new Date();
    let grandTotal = 0;
    for (const unit of units) {
      const pending = unit.fees.reduce((s, f) => s + Number(f.pendingAmount), 0);
      const overdue = unit.fees
        .filter((f) => f.status === "OVERDUE" || new Date(f.dueDate) < now)
        .reduce((s, f) => s + Number(f.pendingAmount), 0);
      grandTotal += pending;
      sheet.addRow({
        code: unit.code,
        tower: unit.tower?.name ?? "N/A",
        count: unit.fees.length,
        pending,
        overdue,
      });
    }

    const totalRow = sheet.addRow({ code: "TOTAL", pending: grandTotal });
    totalRow.font = { bold: true };
    sheet.getColumn("pending").numFmt = '"$"#,##0';
    sheet.getColumn("overdue").numFmt = '"$"#,##0';

    const arrayBuffer = await wb.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async assertAccess(user: AuthUser, propertyId: string, companyId: string): Promise<void> {
    if (user.role === "SUPERADMIN") return;
    if (!["COMPANY_ADMIN", "PROPERTY_ADMIN", "ACCOUNTANT"].includes(user.role)) {
      throw new ForbiddenException("Insufficient permissions for financial reports");
    }
    if (user.role === "COMPANY_ADMIN") {
      if (companyId !== user.companyId) throw new ForbiddenException("Cross-company access denied");
      return;
    }
    const assignment = await this.prisma.propertyUser.findFirst({
      where: { userId: user.sub, propertyId },
    });
    if (!assignment) throw new ForbiddenException("Not assigned to this property");
  }
}
