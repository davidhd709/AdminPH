import { HttpErrorResponse } from "@angular/common/http";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { SelectModule } from "primeng/select";
import { MessageService } from "primeng/api";

import { PageHeader } from "../../shared/components/page-header/page-header";
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { SectionCard } from "../../shared/components/section-card/section-card";
import { ActionToolbar } from "../../shared/components/action-toolbar/action-toolbar";
import { downloadBlob } from "../../core/http/download";
import { PropertyService } from "../properties/property.service";
import { Property } from "../properties/property.models";
import { UnitService } from "../units/unit.service";
import { Unit } from "../units/unit.models";
import { ReportService } from "./report.service";

/**
 * Reportes descargables (Finanzas). Estado de cuenta y paz y salvo por unidad
 * (PDF) y cartera por copropiedad (Excel). Los archivos vienen autenticados,
 * se bajan como Blob y se entregan con downloadBlob.
 */
@Component({
  selector: "app-reports",
  imports: [FormsModule, ButtonModule, SelectModule, PageHeader, EmptyState, SectionCard, ActionToolbar],
  templateUrl: "./reports.html",
})
export class Reports implements OnInit {
  private readonly propertyService = inject(PropertyService);
  private readonly unitService = inject(UnitService);
  private readonly reportService = inject(ReportService);
  private readonly messages = inject(MessageService);

  readonly properties = signal<Property[]>([]);
  readonly selectedPropertyId = signal<string | null>(null);
  readonly units = signal<Unit[]>([]);
  readonly selectedUnitId = signal<string | null>(null);

  readonly dlStatement = signal(false);
  readonly dlPazSalvo = signal(false);
  readonly dlPortfolio = signal(false);

  private readonly unitById = computed(() => new Map(this.units().map((u) => [u.id, u.code])));
  private readonly propertyById = computed(
    () => new Map(this.properties().map((p) => [p.id, p.name])),
  );

  ngOnInit(): void {
    this.propertyService
      .list({ page: 1, pageSize: 100, sortBy: "name", sortOrder: "asc" })
      .subscribe({
        next: (res) => {
          this.properties.set(res.items);
          const first = res.items[0];
          if (first) {
            this.selectedPropertyId.set(first.id);
            this.loadUnits(first.id);
          }
        },
      });
  }

  onPropertyChange(propertyId: string): void {
    this.selectedPropertyId.set(propertyId);
    this.selectedUnitId.set(null);
    this.loadUnits(propertyId);
  }

  private loadUnits(propertyId: string): void {
    this.unitService
      .list(propertyId, { page: 1, pageSize: 100, sortBy: "code", sortOrder: "asc" })
      .subscribe({
        next: (res) => {
          this.units.set(res.items);
          const first = res.items[0];
          this.selectedUnitId.set(first ? first.id : null);
        },
      });
  }

  onUnitChange(unitId: string): void {
    this.selectedUnitId.set(unitId);
  }

  /**
   * Muestra el mensaje real del backend en un error de descarga. Como la
   * respuesta es blob, el cuerpo del error también es un Blob con el JSON
   * (ej. "la unidad tiene deuda pendiente" en paz y salvo).
   */
  private async reportError(error: unknown): Promise<void> {
    let detail = "No se pudo generar el reporte. Intenta más tarde.";
    if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
      try {
        const parsed = JSON.parse(await error.error.text()) as { message?: string };
        if (parsed.message) detail = parsed.message;
      } catch {
        // cuerpo no-JSON: se mantiene el mensaje por defecto.
      }
    }
    this.messages.add({ severity: "warn", summary: "Reporte no disponible", detail });
  }

  downloadStatement(): void {
    const unitId = this.selectedUnitId();
    if (!unitId || this.dlStatement()) return;
    this.dlStatement.set(true);
    this.reportService.accountStatement(unitId).subscribe({
      next: (blob) => {
        downloadBlob(blob, `estado-cuenta-${this.unitById().get(unitId) ?? unitId}.pdf`);
        this.dlStatement.set(false);
        this.messages.add({ severity: "success", summary: "Estado de cuenta descargado" });
      },
      error: (err) => {
        this.dlStatement.set(false);
        void this.reportError(err);
      },
    });
  }

  downloadPazSalvo(): void {
    const unitId = this.selectedUnitId();
    if (!unitId || this.dlPazSalvo()) return;
    this.dlPazSalvo.set(true);
    this.reportService.pazYSalvo(unitId).subscribe({
      next: (blob) => {
        downloadBlob(blob, `paz-y-salvo-${this.unitById().get(unitId) ?? unitId}.pdf`);
        this.dlPazSalvo.set(false);
        this.messages.add({ severity: "success", summary: "Paz y salvo descargado" });
      },
      error: (err) => {
        this.dlPazSalvo.set(false);
        void this.reportError(err);
      },
    });
  }

  downloadPortfolio(): void {
    const propertyId = this.selectedPropertyId();
    if (!propertyId || this.dlPortfolio()) return;
    this.dlPortfolio.set(true);
    this.reportService.portfolio(propertyId).subscribe({
      next: (blob) => {
        downloadBlob(blob, `cartera-${this.propertyById().get(propertyId) ?? propertyId}.xlsx`);
        this.dlPortfolio.set(false);
        this.messages.add({ severity: "success", summary: "Cartera descargada" });
      },
      error: (err) => {
        this.dlPortfolio.set(false);
        void this.reportError(err);
      },
    });
  }
}
