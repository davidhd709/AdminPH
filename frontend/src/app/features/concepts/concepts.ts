import { CurrencyPipe } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { InputNumberModule } from "primeng/inputnumber";
import { SelectModule } from "primeng/select";
import { CheckboxModule } from "primeng/checkbox";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { ConfirmationService, MessageService } from "primeng/api";

import { PageHeader } from "../../shared/components/page-header/page-header";
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { StatusBadge } from "../../shared/components/status-badge/status-badge";
import { SectionCard } from "../../shared/components/section-card/section-card";
import { ActionToolbar } from "../../shared/components/action-toolbar/action-toolbar";
import { AuthStore } from "../../core/auth/auth.store";
import { PropertyService } from "../properties/property.service";
import { Property } from "../properties/property.models";
import { ConceptService } from "./concept.service";
import {
  CALCULATION_TYPE_OPTIONS,
  FEE_CONCEPT_TYPE_OPTIONS,
  FeeConcept,
  calculationTypeLabel,
  feeConceptTypeLabel,
} from "./concept.models";

/**
 * CRUD de Conceptos de cobro por copropiedad (primer módulo de Finanzas).
 * Selector de copropiedad + tabla (no paginada) + diálogo Reactive Forms con
 * tipo, tipo de cálculo, monto por defecto y estado activo.
 */
@Component({
  selector: "app-concepts",
  imports: [
    CurrencyPipe,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    CheckboxModule,
    ConfirmDialogModule,
    PageHeader,
    EmptyState,
    StatusBadge,
    SectionCard,
    ActionToolbar,
  ],
  providers: [ConfirmationService],
  templateUrl: "./concepts.html",
})
export class Concepts implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ConceptService);
  private readonly propertyService = inject(PropertyService);
  private readonly store = inject(AuthStore);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly typeOptions = FEE_CONCEPT_TYPE_OPTIONS;
  readonly calcOptions = CALCULATION_TYPE_OPTIONS;
  readonly typeLabel = feeConceptTypeLabel;
  readonly calcLabel = calculationTypeLabel;

  readonly properties = signal<Property[]>([]);
  readonly selectedPropertyId = signal<string | null>(null);
  readonly concepts = signal<FeeConcept[]>([]);
  readonly loading = signal(false);

  readonly dialogVisible = signal(false);
  readonly saving = signal(false);
  readonly editing = signal<FeeConcept | null>(null);

  readonly canDelete = computed(() => this.store.hasRole("SUPERADMIN", "COMPANY_ADMIN"));

  readonly form = this.fb.nonNullable.group({
    name: ["", [Validators.required, Validators.maxLength(120)]],
    description: [""],
    type: ["ADMINISTRATION" as FeeConcept["type"], [Validators.required]],
    calculationType: ["FIXED" as FeeConcept["calculationType"], [Validators.required]],
    defaultAmount: [0, [Validators.required, Validators.min(0)]],
    active: [true],
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
            this.fetch();
          }
        },
      });
  }

  onPropertyChange(propertyId: string): void {
    this.selectedPropertyId.set(propertyId);
    this.fetch();
  }

  private fetch(): void {
    const propertyId = this.selectedPropertyId();
    if (!propertyId) {
      this.concepts.set([]);
      return;
    }
    this.loading.set(true);
    this.service.list(propertyId).subscribe({
      next: (res) => {
        this.concepts.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({
      name: "",
      description: "",
      type: "ADMINISTRATION",
      calculationType: "FIXED",
      defaultAmount: 0,
      active: true,
    });
    this.dialogVisible.set(true);
  }

  openEdit(concept: FeeConcept): void {
    this.editing.set(concept);
    this.form.reset({
      name: concept.name,
      description: concept.description ?? "",
      type: concept.type,
      calculationType: concept.calculationType,
      defaultAmount: Number(concept.defaultAmount),
      active: concept.active,
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
    const base = {
      name: v.name.trim(),
      description: v.description.trim() || undefined,
      type: v.type,
      calculationType: v.calculationType,
      defaultAmount: v.defaultAmount,
      active: v.active,
    };
    const current = this.editing();

    const request$ = current
      ? this.service.update(current.id, base)
      : this.service.create({ propertyId, ...base });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.messages.add({
          severity: "success",
          summary: current ? "Concepto actualizado" : "Concepto creado",
          detail: base.name,
        });
        this.fetch();
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(concept: FeeConcept): void {
    this.confirm.confirm({
      header: "Eliminar concepto",
      message: `¿Seguro que deseas eliminar "${concept.name}"? Esta acción lo desactiva del sistema.`,
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Eliminar",
      rejectLabel: "Cancelar",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => {
        this.service.remove(concept.id).subscribe({
          next: () => {
            this.messages.add({
              severity: "success",
              summary: "Concepto eliminado",
              detail: concept.name,
            });
            this.fetch();
          },
        });
      },
    });
  }
}
