import { Module } from "@nestjs/common";
import { FinanceModule } from "../finance/finance.module";
import { ReportsController } from "./reports.controller";
import { PdfService } from "./pdf.service";
import { ExcelService } from "./excel.service";

@Module({
  imports: [FinanceModule],
  controllers: [ReportsController],
  providers: [PdfService, ExcelService],
})
export class ReportsModule {}
