import { Component, OnInit, inject, signal } from "@angular/core";
import { MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { TableModule } from "primeng/table";

import { PageHeader } from "../../shared/components/page-header/page-header";
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { StatusBadge } from "../../shared/components/status-badge/status-badge";
import { CurrencyPipe, DatePipe, DecimalPipe } from "@angular/common";
import { blobErrorMessage, downloadBlob } from "../../core/http/download";
import { UnitService } from "../units/unit.service";
import { MyUnit } from "../units/unit.models";
import { FeeService } from "../payments/fee.service";
import { Fee } from "../payments/fee.models";
import { ReportService } from "../reports/report.service";

/**
 * "Mi unidad": vista de propietario/residente con sus unidades, sus cuotas y la
 * descarga de estado de cuenta / paz y salvo (PDF). Datos self-service vía
 * /units/mine; no requiere elegir copropiedad.
 */
@Component({
  selector: "app-my-unit",
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    ButtonModule,
    TableModule,
    PageHeader,
    EmptyState,
    StatusBadge,
  ],
  templateUrl: "./my-unit.html",
})
export class MyUnitPage implements OnInit {
  private readonly unitService = inject(UnitService);
  private readonly feeService = inject(FeeService);
  private readonly reportService = inject(ReportService);
  private readonly messages = inject(MessageService);

  readonly units = signal<MyUnit[]>([]);
  readonly loading = signal(false);
  readonly feesByUnit = signal<Record<string, Fee[]>>({});
  /** Clave `${unitId}:${kind}` de la descarga en curso. */
  readonly downloading = signal<string | null>(null);

  ngOnInit(): void {
    this.loading.set(true);
    this.unitService.mine().subscribe({
      next: (units) => {
        this.units.set(units);
        this.loading.set(false);
        for (const u of units) this.loadFees(u.id);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadFees(unitId: string): void {
    this.feeService
      .list({ unitId, page: 1, pageSize: 50, sortBy: "dueDate", sortOrder: "desc" })
      .subscribe({
        next: (res) => this.feesByUnit.update((m) => ({ ...m, [unitId]: res.items })),
      });
  }

  fees(unitId: string): Fee[] {
    return this.feesByUnit()[unitId] ?? [];
  }

  downloadStatement(unit: MyUnit): void {
    this.download(unit, "statement");
  }

  downloadPazSalvo(unit: MyUnit): void {
    this.download(unit, "pazsalvo");
  }

  private download(unit: MyUnit, kind: "statement" | "pazsalvo"): void {
    const key = `${unit.id}:${kind}`;
    if (this.downloading()) return;
    this.downloading.set(key);
    const req$ =
      kind === "statement"
        ? this.reportService.accountStatement(unit.id)
        : this.reportService.pazYSalvo(unit.id);
    const prefix = kind === "statement" ? "estado-cuenta" : "paz-y-salvo";
    req$.subscribe({
      next: (blob) => {
        downloadBlob(blob, `${prefix}-${unit.code}.pdf`);
        this.downloading.set(null);
      },
      error: async (err) => {
        this.downloading.set(null);
        this.messages.add({
          severity: "warn",
          summary: "Documento no disponible",
          detail: await blobErrorMessage(err),
        });
      },
    });
  }
}
