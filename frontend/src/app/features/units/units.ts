import { DecimalPipe } from "@angular/common";
import { Component, OnInit, ViewChild, computed, inject, signal } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Table, TableLazyLoadEvent, TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { InputNumberModule } from "primeng/inputnumber";
import { SelectModule } from "primeng/select";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { ConfirmationService, MessageService } from "primeng/api";

import { PageHeader } from "../../shared/components/page-header/page-header";
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { StatusBadge } from "../../shared/components/status-badge/status-badge";
import { AuthStore } from "../../core/auth/auth.store";
import { DEFAULT_PAGE_SIZE, PageQuery } from "../../core/http/pagination";
import { PropertyService } from "../properties/property.service";
import { Property } from "../properties/property.models";
import { TowerService } from "../towers/tower.service";
import { Tower } from "../towers/tower.models";
import { UnitService } from "./unit.service";
import { Unit } from "./unit.models";

/**
 * CRUD de Unidades — recurso anidado bajo una copropiedad (y opcionalmente una
 * torre). El usuario elige la copropiedad (selector); la tabla lista sus
 * unidades y el diálogo ofrece las torres de esa copropiedad (cascada).
 * `status` es solo lectura (lo define el backend). Borrado: SUPERADMIN/COMPANY_ADMIN.
 */
@Component({
  selector: "app-units",
  imports: [
    DecimalPipe,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    ConfirmDialogModule,
    PageHeader,
    EmptyState,
    StatusBadge,
  ],
  providers: [ConfirmationService],
  templateUrl: "./units.html",
})
export class Units implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(UnitService);
  private readonly propertyService = inject(PropertyService);
  private readonly towerService = inject(TowerService);
  private readonly store = inject(AuthStore);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  @ViewChild(Table) private table?: Table;

  readonly units = signal<Unit[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly pageSize = DEFAULT_PAGE_SIZE;

  readonly properties = signal<Property[]>([]);
  readonly selectedPropertyId = signal<string | null>(null);

  /** Torres de la copropiedad seleccionada (dropdown del diálogo + lookup tabla). */
  readonly towers = signal<Tower[]>([]);
  private readonly towerById = computed(() => new Map(this.towers().map((t) => [t.id, t.name])));

  readonly dialogVisible = signal(false);
  readonly saving = signal(false);
  readonly editing = signal<Unit | null>(null);

  readonly canDelete = computed(() => this.store.hasRole("SUPERADMIN", "COMPANY_ADMIN"));

  private lastQuery: PageQuery = { page: 1, pageSize: this.pageSize, sortOrder: "desc" };

  readonly form = this.fb.group({
    towerId: this.fb.control<string | null>(null),
    code: this.fb.nonNullable.control("", [Validators.required, Validators.maxLength(40)]),
    floor: this.fb.nonNullable.control(1, [Validators.required, Validators.min(0)]),
    number: this.fb.nonNullable.control("", [Validators.required]),
    area: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    coefficient: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
  });

  ngOnInit(): void {
    this.propertyService
      .list({ page: 1, pageSize: 100, sortBy: "name", sortOrder: "asc" })
      .subscribe({
        next: (res) => {
          this.properties.set(res.items);
          const first = res.items[0];
          if (first) {
            this.selectedPropertyId.set(first.id);
            this.loadTowers(first.id);
            this.fetch();
          }
        },
      });
  }

  onPropertyChange(propertyId: string): void {
    this.selectedPropertyId.set(propertyId);
    this.loadTowers(propertyId);
    if (this.table) this.table.reset();
    else this.fetch();
  }

  private loadTowers(propertyId: string): void {
    this.towerService.list(propertyId, { page: 1, pageSize: 100, sortBy: "name", sortOrder: "asc" }).subscribe({
      next: (res) => this.towers.set(res.items),
    });
  }

  towerName(id: string | null): string {
    return id ? (this.towerById().get(id) ?? "—") : "—";
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
      this.units.set([]);
      this.total.set(0);
      return;
    }
    this.loading.set(true);
    this.service.list(propertyId, this.lastQuery).subscribe({
      next: (res) => {
        this.units.set(res.items);
        this.total.set(res.meta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ towerId: null, code: "", floor: 1, number: "", area: 0, coefficient: 0 });
    this.dialogVisible.set(true);
  }

  openEdit(unit: Unit): void {
    this.editing.set(unit);
    this.form.reset({
      towerId: unit.towerId,
      code: unit.code,
      floor: unit.floor,
      number: unit.number,
      area: Number(unit.area),
      coefficient: Number(unit.coefficient),
    });
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

    const base = {
      towerId: v.towerId ?? undefined,
      code: v.code.trim(),
      floor: v.floor,
      number: v.number.trim(),
      area: v.area,
      coefficient: v.coefficient,
    };

    const request$ = current
      ? this.service.update(current.id, base)
      : this.service.create({ propertyId, ...base });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.messages.add({
          severity: "success",
          summary: current ? "Unidad actualizada" : "Unidad creada",
          detail: base.code,
        });
        this.fetch();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(unit: Unit): void {
    this.confirm.confirm({
      header: "Eliminar unidad",
      message: `¿Seguro que deseas eliminar la unidad "${unit.code}"? Esta acción la desactiva del sistema.`,
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Eliminar",
      rejectLabel: "Cancelar",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => {
        this.service.remove(unit.id).subscribe({
          next: () => {
            this.messages.add({ severity: "success", summary: "Unidad eliminada", detail: unit.code });
            this.fetch();
          },
        });
      },
    });
  }
}
