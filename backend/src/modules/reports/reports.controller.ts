import { Controller, Get, Param, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { PdfService } from "./pdf.service";
import { ExcelService } from "./excel.service";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { Roles } from "../../core/decorators/roles.decorator";
import { AuthUser } from "../../core/types/auth-user";

@ApiTags("reports")
@ApiBearerAuth()
@Controller("reports")
export class ReportsController {
  constructor(
    private readonly pdf: PdfService,
    private readonly excel: ExcelService,
  ) {}

  @Get("account-statement/:unitId.pdf")
  async accountStatement(
    @Param("unitId") unitId: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.pdf.accountStatement(unitId, user);
    this.sendPdf(res, buffer, `estado-cuenta-${unitId}.pdf`);
  }

  @Get("paz-y-salvo/:unitId.pdf")
  async pazYSalvo(
    @Param("unitId") unitId: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.pdf.pazYSalvo(unitId, user);
    this.sendPdf(res, buffer, `paz-y-salvo-${unitId}.pdf`);
  }

  @Get("portfolio/:propertyId.xlsx")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN", "ACCOUNTANT")
  async portfolio(
    @Param("propertyId") propertyId: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.excel.portfolio(propertyId, user);
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="cartera-${propertyId}.xlsx"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  private sendPdf(res: Response, buffer: Buffer, filename: string): void {
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }
}
