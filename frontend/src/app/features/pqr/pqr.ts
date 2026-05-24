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
import { StatusBadge } from "../../shared/components/status-badge/status-badge";
import { AuthStore } from "../../core/auth/auth.store";
import { DEFAULT_PAGE_SIZE, PageQuery } from "../../core/http/pagination";
import { PropertyService } from "../properties/property.service";
import { Property } from "../properties/property.models";
import { UnitService } from "../units/unit.service";
import { Unit } from "../units/unit.models";
import { PqrService } from "./pqr.service";
import {
  PQR_CATEGORY_OPTIONS,
  PQR_STATUS_OPTIONS,
  Pqr,
  PqrCategory,
  PqrDetail,
  PqrStatus,
  buildRadicado,
  pqrCategoryLabel,
} from "./pqr.models";

/**
 * Gestión de PQR (Operación). Lista paginada con filtros (copropiedad, estado,
 * categoría), creación, y detalle con hilo de respuestas + cambio de estado
 * (staff). Acceso para roles staff (SUPERADMIN/COMPANY_ADMIN/PROPERTY_ADMIN).
 */
@Component({
  selector: "app-pqr",
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
    StatusBadge,
  ],
  templateUrl: "./pqr.html",
})
export class PqrPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PqrService);
  private readonly propertyService = inject(PropertyService);
  private readonly unitService = inject(UnitService);
  private readonly store = inject(AuthStore);
  private readonly messages = inject(MessageService);

  @ViewChild(Table) private table?: Table;

  readonly categoryOptions = PQR_CATEGORY_OPTIONS;
  readonly statusOptions = PQR_STATUS_OPTIONS;
  readonly categoryLabel = pqrCategoryLabel;
  readonly radicado = buildRadicado;

  readonly properties = signal<Property[]>([]);
  readonly dialogUnits = signal<Unit[]>([]);

  // Filtros
  readonly filterPropertyId = signal<string | null>(null);
  readonly filterStatus = signal<PqrStatus | null>(null);
  readonly filterCategory = signal<PqrCategory | null>(null);

  readonly pqrs = signal<Pqr[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private lastQuery: PageQuery = { page: 1, pageSize: this.pageSize, sortOrder: "desc" };

  // Crear
  readonly createVisible = signal(false);
  readonly savingCreate = signal(false);
  readonly createForm = this.fb.nonNullable.group({
    propertyId: ["", [Validators.required]],
    category: ["PETITION" as PqrCategory, [Validators.required]],
    subject: ["", [Validators.required, Validators.maxLength(200)]],
    description: ["", [Validators.required, Validators.maxLength(5000)]],
    unitId: this.fb.control<string | null>(null),
  });

  // Detalle
  readonly detailVisible = signal(false);
  readonly loadingDetail = signal(false);
  readonly detail = signal<PqrDetail | null>(null);
  readonly responding = signal(false);
  readonly updatingStatus = signal(false);
  readonly respondForm = this.fb.nonNullable.group({
    message: ["", [Validators.required, Validators.maxLength(5000)]],
  });
  readonly statusControl = this.fb.nonNullable.control<PqrStatus>("OPEN");

  readonly currentUserId = this.store.user()?.id ?? null;

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
      .list({
        ...this.lastQuery,
        propertyId: this.filterPropertyId() ?? undefined,
        status: this.filterStatus() ?? undefined,
        category: this.filterCategory() ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.pqrs.set(res.items);
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  // ===== Crear =====
  openCreate(): void {
    this.createForm.reset({
      propertyId: this.filterPropertyId() ?? "",
      category: "PETITION",
      subject: "",
      description: "",
      unitId: null,
    });
    this.dialogUnits.set([]);
    const pid = this.filterPropertyId();
    if (pid) this.loadDialogUnits(pid);
    this.createVisible.set(true);
  }

  onCreatePropertyChange(propertyId: string): void {
    this.createForm.controls.unitId.setValue(null);
    this.loadDialogUnits(propertyId);
  }

  private loadDialogUnits(propertyId: string): void {
    this.unitService
      .list(propertyId, { page: 1, pageSize: 100, sortBy: "code", sortOrder: "asc" })
      .subscribe({ next: (res) => this.dialogUnits.set(res.items) });
  }

  saveCreate(): void {
    if (this.createForm.invalid || this.savingCreate()) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.savingCreate.set(true);
    const v = this.createForm.getRawValue();
    this.service
      .create({
        propertyId: v.propertyId,
        category: v.category,
        subject: v.subject.trim(),
        description: v.description.trim(),
        unitId: v.unitId ?? undefined,
      })
      .subscribe({
        next: () => {
          this.savingCreate.set(false);
          this.createVisible.set(false);
          this.messages.add({ severity: "success", summary: "PQR creada" });
          this.applyFilters();
        },
        error: () => this.savingCreate.set(false),
      });
  }

  // ===== Detalle =====
  openDetail(pqr: Pqr): void {
    this.detail.set(null);
    this.respondForm.reset({ message: "" });
    this.detailVisible.set(true);
    this.loadDetail(pqr.id);
  }

  private loadDetail(id: string): void {
    this.loadingDetail.set(true);
    this.service.getById(id).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.statusControl.setValue(d.status);
        this.loadingDetail.set(false);
      },
      error: () => this.loadingDetail.set(false),
    });
  }

  submitResponse(): void {
    const current = this.detail();
    if (this.respondForm.invalid || this.responding() || !current) {
      this.respondForm.markAllAsTouched();
      return;
    }
    this.responding.set(true);
    this.service.respond(current.id, this.respondForm.getRawValue().message.trim()).subscribe({
      next: () => {
        this.responding.set(false);
        this.respondForm.reset({ message: "" });
        this.messages.add({ severity: "success", summary: "Respuesta enviada" });
        this.loadDetail(current.id);
        this.fetch();
      },
      error: () => this.responding.set(false),
    });
  }

  updateStatus(): void {
    const current = this.detail();
    if (!current || this.updatingStatus()) return;
    const status = this.statusControl.value;
    if (status === current.status) return;
    this.updatingStatus.set(true);
    this.service.updateStatus(current.id, status).subscribe({
      next: () => {
        this.updatingStatus.set(false);
        this.messages.add({ severity: "success", summary: "Estado actualizado" });
        this.loadDetail(current.id);
        this.fetch();
      },
      error: () => this.updatingStatus.set(false),
    });
  }
}
