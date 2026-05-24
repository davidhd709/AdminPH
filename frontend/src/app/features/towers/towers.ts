import { DatePipe } from "@angular/common";
import { Component, OnInit, ViewChild, computed, inject, signal } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Table, TableLazyLoadEvent, TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { TextareaModule } from "primeng/textarea";
import { SelectModule } from "primeng/select";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { ConfirmationService, MessageService } from "primeng/api";

import { PageHeader } from "../../shared/components/page-header/page-header";
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { AuthStore } from "../../core/auth/auth.store";
import { DEFAULT_PAGE_SIZE, PageQuery } from "../../core/http/pagination";
import { PropertyService } from "../properties/property.service";
import { Property } from "../properties/property.models";
import { TowerService } from "./tower.service";
import { Tower } from "./tower.models";

/**
 * CRUD de Torres — recurso anidado bajo una copropiedad.
 * El usuario elige primero la copropiedad (selector) y la tabla lista sus
 * torres (paginación/orden server-side). El borrado solo lo permiten
 * SUPERADMIN y COMPANY_ADMIN (el backend rechaza a PROPERTY_ADMIN).
 */
@Component({
  selector: "app-towers",
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    ConfirmDialogModule,
    PageHeader,
    EmptyState,
  ],
  providers: [ConfirmationService],
  templateUrl: "./towers.html",
})
export class Towers implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TowerService);
  private readonly propertyService = inject(PropertyService);
  private readonly store = inject(AuthStore);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  @ViewChild(Table) private table?: Table;

  readonly towers = signal<Tower[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly pageSize = DEFAULT_PAGE_SIZE;

  readonly properties = signal<Property[]>([]);
  readonly selectedPropertyId = signal<string | null>(null);

  readonly dialogVisible = signal(false);
  readonly saving = signal(false);
  readonly editing = signal<Tower | null>(null);

  /** Solo estos roles pueden borrar (el backend lo exige). */
  readonly canDelete = computed(() => this.store.hasRole("SUPERADMIN", "COMPANY_ADMIN"));

  private lastQuery: PageQuery = { page: 1, pageSize: this.pageSize, sortOrder: "desc" };

  readonly form = this.fb.nonNullable.group({
    name: ["", [Validators.required, Validators.maxLength(120)]],
    description: [""],
  });

  ngOnInit(): void {
    this.propertyService
      .list({ page: 1, pageSize: 100, sortBy: "name", sortOrder: "asc" })
      .subscribe({
        next: (res) => {
          this.properties.set(res.items);
          // Autoselecciona la primera copropiedad para no dejar la vista vacía.
          const first = res.items[0];
          if (first) {
            this.selectedPropertyId.set(first.id);
            this.fetch();
          }
        },
      });
  }

  onPropertyChange(propertyId: string): void {
    this.selectedPropertyId.set(propertyId);
    // reset() vuelve a página 1 y dispara onLazyLoad (un solo fetch).
    if (this.table) this.table.reset();
    else this.fetch();
  }

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
    const propertyId = this.selectedPropertyId();
    if (!propertyId) {
      this.towers.set([]);
      this.total.set(0);
      return;
    }
    this.loading.set(true);
    this.service.list(propertyId, this.lastQuery).subscribe({
      next: (res) => {
        this.towers.set(res.items);
        this.total.set(res.meta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: "", description: "" });
    this.dialogVisible.set(true);
  }

  openEdit(tower: Tower): void {
    this.editing.set(tower);
    this.form.reset({ name: tower.name, description: tower.description ?? "" });
    this.dialogVisible.set(true);
  }

  save(): void {
    const propertyId = this.selectedPropertyId();
    if (this.form.invalid || this.saving() || !propertyId) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const current = this.editing();

    const request$ = current
      ? this.service.update(current.id, {
          name: v.name.trim(),
          description: v.description.trim() || undefined,
        })
      : this.service.create({
          propertyId,
          name: v.name.trim(),
          description: v.description.trim() || undefined,
        });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.messages.add({
          severity: "success",
          summary: current ? "Torre actualizada" : "Torre creada",
          detail: v.name,
        });
        this.fetch();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(tower: Tower): void {
    this.confirm.confirm({
      header: "Eliminar torre",
      message: `¿Seguro que deseas eliminar "${tower.name}"? Esta acción la desactiva del sistema.`,
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Eliminar",
      rejectLabel: "Cancelar",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => {
        this.service.remove(tower.id).subscribe({
          next: () => {
            this.messages.add({
              severity: "success",
              summary: "Torre eliminada",
              detail: tower.name,
            });
            this.fetch();
          },
        });
      },
    });
  }
}
