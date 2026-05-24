import { DatePipe } from "@angular/common";
import { Component, OnInit, ViewChild, inject, signal } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Table, TableLazyLoadEvent, TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { TextareaModule } from "primeng/textarea";
import { SelectModule } from "primeng/select";
import { MessageService } from "primeng/api";

import { PageHeader } from "../../shared/components/page-header/page-header";
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { DEFAULT_PAGE_SIZE, PageQuery } from "../../core/http/pagination";
import { PropertyService } from "../properties/property.service";
import { Property } from "../properties/property.models";
import { TowerService } from "../towers/tower.service";
import { Tower } from "../towers/tower.models";
import { UnitService } from "../units/unit.service";
import { Unit } from "../units/unit.models";
import { AnnouncementService } from "./announcement.service";
import {
  ANNOUNCEMENT_SCOPE_OPTIONS,
  Announcement,
  AnnouncementScope,
  announcementScopeLabel,
} from "./announcement.models";

/**
 * Comunicados (Operación). Lista paginada filtrable por copropiedad, creación
 * con alcance (toda la copropiedad / torre / unidad) y detalle del cuerpo.
 * Acceso staff (SUPERADMIN/COMPANY_ADMIN/PROPERTY_ADMIN).
 */
@Component({
  selector: "app-announcements",
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
    PageHeader,
    EmptyState,
  ],
  templateUrl: "./announcements.html",
})
export class Announcements implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AnnouncementService);
  private readonly propertyService = inject(PropertyService);
  private readonly towerService = inject(TowerService);
  private readonly unitService = inject(UnitService);
  private readonly messages = inject(MessageService);

  @ViewChild(Table) private table?: Table;

  readonly scopeOptions = ANNOUNCEMENT_SCOPE_OPTIONS;
  readonly scopeLabel = announcementScopeLabel;

  readonly properties = signal<Property[]>([]);
  readonly filterPropertyId = signal<string | null>(null);

  readonly announcements = signal<Announcement[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private lastQuery: PageQuery = { page: 1, pageSize: this.pageSize, sortOrder: "desc" };

  // Crear
  readonly createVisible = signal(false);
  readonly savingCreate = signal(false);
  readonly createScope = signal<AnnouncementScope>("PROPERTY");
  readonly dialogTowers = signal<Tower[]>([]);
  readonly dialogUnits = signal<Unit[]>([]);
  readonly createForm = this.fb.nonNullable.group({
    propertyId: ["", [Validators.required]],
    scope: ["PROPERTY" as AnnouncementScope, [Validators.required]],
    towerId: this.fb.control<string | null>(null),
    unitId: this.fb.control<string | null>(null),
    title: ["", [Validators.required, Validators.maxLength(200)]],
    body: ["", [Validators.required, Validators.maxLength(10000)]],
  });

  // Detalle
  readonly detailVisible = signal(false);
  readonly detail = signal<Announcement | null>(null);

  ngOnInit(): void {
    this.propertyService
      .list({ page: 1, pageSize: 100, sortBy: "name", sortOrder: "asc" })
      .subscribe({ next: (res) => this.properties.set(res.items) });
  }

  applyFilters(): void {
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
    this.loading.set(true);
    this.service
      .list({ ...this.lastQuery, propertyId: this.filterPropertyId() ?? undefined })
      .subscribe({
        next: (res) => {
          this.announcements.set(res.items);
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  // ===== Crear =====
  openCreate(): void {
    this.createScope.set("PROPERTY");
    this.createForm.reset({
      propertyId: this.filterPropertyId() ?? "",
      scope: "PROPERTY",
      towerId: null,
      unitId: null,
      title: "",
      body: "",
    });
    this.dialogTowers.set([]);
    this.dialogUnits.set([]);
    const pid = this.filterPropertyId();
    if (pid) this.loadDialogScopes(pid);
    this.createVisible.set(true);
  }

  onCreatePropertyChange(propertyId: string): void {
    this.createForm.controls.towerId.setValue(null);
    this.createForm.controls.unitId.setValue(null);
    this.loadDialogScopes(propertyId);
  }

  onScopeChange(scope: AnnouncementScope): void {
    this.createScope.set(scope);
    this.createForm.controls.towerId.setValue(null);
    this.createForm.controls.unitId.setValue(null);
  }

  private loadDialogScopes(propertyId: string): void {
    this.towerService
      .list(propertyId, { page: 1, pageSize: 100, sortBy: "name", sortOrder: "asc" })
      .subscribe({ next: (res) => this.dialogTowers.set(res.items) });
    this.unitService
      .list(propertyId, { page: 1, pageSize: 100, sortBy: "code", sortOrder: "asc" })
      .subscribe({ next: (res) => this.dialogUnits.set(res.items) });
  }

  saveCreate(): void {
    const v = this.createForm.getRawValue();
    // Validación condicional según alcance.
    if (v.scope === "TOWER" && !v.towerId) {
      this.messages.add({ severity: "warn", summary: "Selecciona la torre destino" });
      return;
    }
    if (v.scope === "UNIT" && !v.unitId) {
      this.messages.add({ severity: "warn", summary: "Selecciona la unidad destino" });
      return;
    }
    if (this.createForm.invalid || this.savingCreate()) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.savingCreate.set(true);
    this.service
      .create({
        propertyId: v.propertyId,
        scope: v.scope,
        title: v.title.trim(),
        body: v.body.trim(),
        towerId: v.scope === "TOWER" ? (v.towerId ?? undefined) : undefined,
        unitId: v.scope === "UNIT" ? (v.unitId ?? undefined) : undefined,
      })
      .subscribe({
        next: () => {
          this.savingCreate.set(false);
          this.createVisible.set(false);
          this.messages.add({ severity: "success", summary: "Comunicado publicado" });
          this.applyFilters();
        },
        error: () => this.savingCreate.set(false),
      });
  }

  // ===== Detalle =====
  openDetail(announcement: Announcement): void {
    this.detail.set(announcement);
    this.detailVisible.set(true);
  }
}
