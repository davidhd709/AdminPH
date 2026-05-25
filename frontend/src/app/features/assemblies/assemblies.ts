import { DatePipe } from "@angular/common";
import { Component, OnInit, ViewChild, inject, signal } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { Table, TableLazyLoadEvent, TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { InputNumberModule } from "primeng/inputnumber";
import { TextareaModule } from "primeng/textarea";
import { SelectModule } from "primeng/select";
import { DatePickerModule } from "primeng/datepicker";
import { MessageService } from "primeng/api";

import { PageHeader } from "../../shared/components/page-header/page-header";
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { StatusBadge } from "../../shared/components/status-badge/status-badge";
import { SectionCard } from "../../shared/components/section-card/section-card";
import { ActionToolbar } from "../../shared/components/action-toolbar/action-toolbar";
import { DEFAULT_PAGE_SIZE, PageQuery } from "../../core/http/pagination";
import { PropertyService } from "../properties/property.service";
import { Property } from "../properties/property.models";
import { AssemblyService } from "./assembly.service";
import {
  ASSEMBLY_STATUS_OPTIONS,
  ASSEMBLY_TYPE_OPTIONS,
  Assembly,
  AssemblyStatus,
  AssemblyType,
  assemblyTypeLabel,
} from "./assembly.models";

/**
 * Lista de asambleas (Operación). Filtros (copropiedad/estado/tipo) y creación.
 * El detalle (asistencia, votaciones, votos) vive en /app/assemblies/:id.
 */
@Component({
  selector: "app-assemblies",
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
    PageHeader,
    EmptyState,
    StatusBadge,
    SectionCard,
    ActionToolbar,
  ],
  templateUrl: "./assemblies.html",
})
export class Assemblies implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AssemblyService);
  private readonly propertyService = inject(PropertyService);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);

  @ViewChild(Table) private table?: Table;

  readonly typeOptions = ASSEMBLY_TYPE_OPTIONS;
  readonly statusOptions = ASSEMBLY_STATUS_OPTIONS;
  readonly typeLabel = assemblyTypeLabel;

  readonly properties = signal<Property[]>([]);
  readonly filterPropertyId = signal<string | null>(null);
  readonly filterStatus = signal<AssemblyStatus | null>(null);
  readonly filterType = signal<AssemblyType | null>(null);

  readonly assemblies = signal<Assembly[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private lastQuery: PageQuery = { page: 1, pageSize: this.pageSize, sortOrder: "desc" };

  readonly createVisible = signal(false);
  readonly savingCreate = signal(false);
  readonly createForm = this.fb.nonNullable.group({
    propertyId: ["", [Validators.required]],
    title: ["", [Validators.required, Validators.maxLength(200)]],
    type: ["ORDINARY" as AssemblyType, [Validators.required]],
    scheduledAt: [new Date(), [Validators.required]],
    quorumPercent: this.fb.control<number | null>(null),
    agenda: [""],
  });

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
        type: this.filterType() ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.assemblies.set(res.items);
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  openDetail(a: Assembly): void {
    void this.router.navigate(["/app/assemblies", a.id]);
  }

  openCreate(): void {
    const scheduled = new Date();
    scheduled.setHours(scheduled.getHours() + 24, 0, 0, 0);
    this.createForm.reset({
      propertyId: this.filterPropertyId() ?? "",
      title: "",
      type: "ORDINARY",
      scheduledAt: scheduled,
      quorumPercent: null,
      agenda: "",
    });
    this.createVisible.set(true);
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
        title: v.title.trim(),
        type: v.type,
        scheduledAt: v.scheduledAt.toISOString(),
        quorumPercent: v.quorumPercent ?? undefined,
        agenda: v.agenda.trim() || undefined,
      })
      .subscribe({
        next: (created) => {
          this.savingCreate.set(false);
          this.createVisible.set(false);
          this.messages.add({ severity: "success", summary: "Asamblea creada" });
          void this.router.navigate(["/app/assemblies", created.id]);
        },
        error: () => this.savingCreate.set(false),
      });
  }
}
