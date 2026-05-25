import { DatePipe } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { TableLazyLoadEvent, TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { ConfirmationService, MessageService } from "primeng/api";

import { PageHeader } from "../../shared/components/page-header/page-header";
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { StatusBadge } from "../../shared/components/status-badge/status-badge";
import { SectionCard } from "../../shared/components/section-card/section-card";
import { DEFAULT_PAGE_SIZE, PageQuery } from "../../core/http/pagination";
import { CompanyService } from "./company.service";
import { Company } from "./company.models";

/**
 * CRUD de Empresas — primer módulo de negocio conectado a la API.
 * Tabla con paginación/ordenamiento server-side (lazy), alta/edición en
 * diálogo con Reactive Forms y borrado (soft-delete) con confirmación.
 * Solo SUPERADMIN (protegido por roleGuard en app.routes.ts).
 *
 * Patrón de referencia a replicar por los módulos siguientes.
 */
@Component({
  selector: "app-companies",
  imports: [
    DatePipe,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    ConfirmDialogModule,
    PageHeader,
    EmptyState,
    StatusBadge,
    SectionCard,
  ],
  providers: [ConfirmationService],
  templateUrl: "./companies.html",
})
export class Companies {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CompanyService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly companies = signal<Company[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly pageSize = DEFAULT_PAGE_SIZE;

  readonly dialogVisible = signal(false);
  readonly saving = signal(false);
  readonly editing = signal<Company | null>(null);

  /** Última consulta para recargar la tabla tras una mutación. */
  private lastQuery: PageQuery = { page: 1, pageSize: this.pageSize, sortOrder: "desc" };

  readonly form = this.fb.nonNullable.group({
    name: ["", [Validators.required, Validators.maxLength(120)]],
    nit: [""],
  });

  /** Carga server-side disparada por el p-table (paginación + orden). */
  loadLazy(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.pageSize;
    const first = event.first ?? 0;
    const sortField = Array.isArray(event.sortField) ? event.sortField[0] : event.sortField;

    this.lastQuery = {
      page: Math.floor(first / rows) + 1,
      pageSize: rows,
      sortBy: sortField || undefined,
      sortOrder: event.sortOrder === 1 ? "asc" : "desc",
    };
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.service.list(this.lastQuery).subscribe({
      next: (res) => {
        this.companies.set(res.items);
        this.total.set(res.meta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: "", nit: "" });
    this.dialogVisible.set(true);
  }

  openEdit(company: Company): void {
    this.editing.set(company);
    this.form.reset({ name: company.name, nit: company.nit ?? "" });
    this.dialogVisible.set(true);
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const payload = { name: raw.name.trim(), nit: raw.nit.trim() || undefined };
    const current = this.editing();

    const request$ = current
      ? this.service.update(current.id, payload)
      : this.service.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.messages.add({
          severity: "success",
          summary: current ? "Empresa actualizada" : "Empresa creada",
          detail: payload.name,
        });
        this.fetch();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(company: Company): void {
    this.confirm.confirm({
      header: "Eliminar empresa",
      message: `¿Seguro que deseas eliminar "${company.name}"? Esta acción la desactiva del sistema.`,
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Eliminar",
      rejectLabel: "Cancelar",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => {
        this.service.remove(company.id).subscribe({
          next: () => {
            this.messages.add({
              severity: "success",
              summary: "Empresa eliminada",
              detail: company.name,
            });
            this.fetch();
          },
        });
      },
    });
  }
}
