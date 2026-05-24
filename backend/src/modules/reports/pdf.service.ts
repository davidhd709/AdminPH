import { ForbiddenException, Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";
import { AccountStatementService } from "../finance/account-statement.service";
import { AuthUser } from "../../core/types/auth-user";

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

@Injectable()
export class PdfService {
  constructor(private readonly statements: AccountStatementService) {}

  /** Estado de cuenta de una unidad en PDF. */
  async accountStatement(unitId: string, user: AuthUser): Promise<Buffer> {
    const data = await this.statements.getStatement(unitId, user);
    return this.render((doc) => {
      this.header(doc, "Estado de Cuenta");
      doc.fontSize(11).fillColor("#000");
      doc.text(`Copropiedad: ${data.unit.property?.name ?? "-"}`);
      doc.text(`Unidad: ${data.unit.code}  Torre: ${data.unit.tower?.name ?? "N/A"}`);
      doc.moveDown();

      doc.fontSize(13).text("Resumen", { underline: true });
      doc.fontSize(11);
      doc.text(`Total pagado:    ${COP.format(data.summary.totalPaid)}`);
      doc.text(`Total pendiente: ${COP.format(data.summary.totalPending)}`);
      doc.text(`Total en mora:   ${COP.format(data.summary.totalOverdue)}`);
      doc.moveDown();

      doc.fontSize(13).text("Cuotas pendientes", { underline: true });
      doc.fontSize(10);
      if (data.pendingFees.length === 0) {
        doc.text("Sin cuotas pendientes.");
      } else {
        for (const fee of data.pendingFees) {
          doc.text(
            `· Periodo ${fee.period} — vence ${new Date(fee.dueDate)
              .toISOString()
              .slice(0, 10)} — ${COP.format(Number(fee.pendingAmount))} (${fee.status})`,
          );
        }
      }
    });
  }

  /** Certificado de paz y salvo (solo si la unidad no tiene deuda). */
  async pazYSalvo(unitId: string, user: AuthUser): Promise<Buffer> {
    const data = await this.statements.getStatement(unitId, user);
    if (data.summary.totalPending > 0) {
      throw new ForbiddenException(
        "No se puede emitir paz y salvo: la unidad tiene deuda pendiente",
      );
    }
    return this.render((doc) => {
      this.header(doc, "Certificado de Paz y Salvo");
      doc.fontSize(12).fillColor("#000").moveDown();
      doc.text(
        `Se certifica que la unidad ${data.unit.code} de la copropiedad ` +
          `${data.unit.property?.name ?? "-"} se encuentra A PAZ Y SALVO por concepto ` +
          `de cuotas de administración y demás obligaciones a la fecha de expedición.`,
        { align: "justify" },
      );
      doc.moveDown(2);
      doc.text(`Fecha de expedición: ${new Date().toISOString().slice(0, 10)}`);
      doc.moveDown(3);
      doc.text("_______________________________");
      doc.text("Administración");
    });
  }

  // ===== helpers =====

  private header(doc: PDFKit.PDFDocument, title: string): void {
    doc.fontSize(18).fillColor("#1a3c5e").text("AdminPH", { align: "right" });
    doc.fontSize(16).fillColor("#000").text(title);
    doc.moveDown(0.5);
    doc
      .strokeColor("#1a3c5e")
      .moveTo(doc.x, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();
    doc.moveDown();
  }

  private render(draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      draw(doc);
      doc.end();
    });
  }
}
