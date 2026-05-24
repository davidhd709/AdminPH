import { DatePipe, DecimalPipe } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { TableLazyLoadEvent, TableModule } from "primeng/table";
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
import { CompanyService } from "../companies/company.service";
import { Company } from "../companies/company.models";
import { PropertyService } from "./property.service";
import { Property } from "./property.models";

/**
 * CRUD de Copropiedades — módulo multi-tenant.
 * SUPERADMIN ve todas y elige empresa al crear; COMPANY_ADMIN queda acotado a
 * su propia empresa (companyId del token). Tabla lazy (paginación/orden
 * server-side), alta/edición en diálogo y borrado con confirmación.
 */
@Component({
  selector: "app-properties",
  imports: [
    DatePipe,
    DecimalPipe,
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
  templateUrl: "./properties.html",
})
export class Properties implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PropertyService);
  private readonly companyService = inject(CompanyService);
  private readonly store = inject(AuthStore);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly properties = signal<Property[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly pageSize = DEFAULT_PAGE_SIZE;

  readonly dialogVisible = signal(false);
  readonly saving = signal(false);
  readonly editing = signal<Property | null>(null);

  /** Empresas para el dropdown (SUPERADMIN) y para resolver nombres en la tabla. */
  readonly companies = signal<Company[]>([]);
  private readonly companyById = computed(
    () => new Map(this.companies().map((c) => [c.id, c.name])),
  );
  readonly isSuperadmin = computed(() => this.store.role() === "SUPERADMIN");

  private lastQuery: PageQuery = { page: 1, pageSize: this.pageSize, sortOrder: "desc" };

  readonly form = this.fb.nonNullable.group({
    companyId: ["", [Validators.required]],
    name: ["", [Validators.required, Validators.maxLength(120)]],
    nit: [""],
    address: ["", [Validators.required]],
    city: ["", [Validators.required]],
    department: ["", [Validators.required]],
    phone: [""],
    email: ["", [Validators.email]],
    coefficientTotal: [100, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    // Empresas visibles según el rol (el backend acota a COMPANY_ADMIN).
    this.companyService.list({ page: 1, pageSize: 100, sortBy: "name", sortOrder: "asc" }).subscribe({
      next: (res) => this.companies.set(res.items),
    });
  }

  companyName(id: string): string {
    return this.companyById().get(id) ?? "—";
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
    this.service.list(this.lastQuery).subscribe({
      next: (res) => {
        this.properties.set(res.items);
        this.total.set(res.meta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({
      companyId: this.isSuperadmin() ? "" : (this.store.companyId() ?? ""),
      name: "",
      nit: "",
      address: "",
      city: "",
      department: "",
      phone: "",
      email: "",
      coefficientTotal: 100,
    });
    this.dialogVisible.set(true);
  }

  openEdit(property: Property): void {
    this.editing.set(property);
    this.form.reset({
      companyId: property.companyId,
      name: property.name,
      nit: property.nit ?? "",
      address: property.address,
      city: property.city,
      department: property.department,
      phone: property.phone ?? "",
      email: property.email ?? "",
      coefficientTotal: Number(property.coefficientTotal),
    });
    this.dialogVisible.set(true);
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const current = this.editing();

    const request$ = current
      ? this.service.update(current.id, {
          name: v.name.trim(),
          nit: v.nit.trim() || undefined,
          address: v.address.trim(),
          city: v.city.trim(),
          department: v.department.trim(),
          phone: v.phone.trim() || undefined,
          email: v.email.trim() || undefined,
          coefficientTotal: v.coefficientTotal,
        })
      : this.service.create({
          companyId: v.companyId,
          name: v.name.trim(),
          nit: v.nit.trim() || undefined,
          address: v.address.trim(),
          city: v.city.trim(),
          department: v.department.trim(),
          phone: v.phone.trim() || undefined,
          email: v.email.trim() || undefined,
          coefficientTotal: v.coefficientTotal,
        });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.messages.add({
          severity: "success",
          summary: current ? "Copropiedad actualizada" : "Copropiedad creada",
          detail: v.name,
        });
        this.fetch();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(property: Property): void {
    this.confirm.confirm({
      header: "Eliminar copropiedad",
      message: `¿Seguro que deseas eliminar "${property.name}"? Esta acción la desactiva del sistema.`,
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Eliminar",
      rejectLabel: "Cancelar",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => {
        this.service.remove(property.id).subscribe({
          next: () => {
            this.messages.add({
              severity: "success",
              summary: "Copropiedad eliminada",
              detail: property.name,
            });
            this.fetch();
          },
        });
      },
    });
  }
}
