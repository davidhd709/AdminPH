import { CurrencyPipe, DatePipe } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { InputNumberModule } from "primeng/inputnumber";
import { TextareaModule } from "primeng/textarea";
import { SelectModule } from "primeng/select";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { ConfirmationService, MessageService } from "primeng/api";

import { PageHeader } from "../../shared/components/page-header/page-header";
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { StatusBadge } from "../../shared/components/status-badge/status-badge";
import { PropertyService } from "../properties/property.service";
import { Property } from "../properties/property.models";
import { UnitService } from "../units/unit.service";
import { Unit } from "../units/unit.models";
import { FeeService } from "./fee.service";
import { Fee } from "./fee.models";
import { PaymentService } from "./payment.service";
import { Payment } from "./payment.models";

/**
 * Pagos y cuotas por unidad (Finanzas).
 * Cascada copropiedad → unidad → (cuotas + pagos). Permite registrar un pago
 * (queda en revisión) y, para revisores, aprobar (asigna a cuotas oldest-first
 * en el backend) o rechazar.
 */
@Component({
  selector: "app-payments",
  imports: [
    CurrencyPipe,
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
    ConfirmDialogModule,
    PageHeader,
    EmptyState,
    StatusBadge,
  ],
  providers: [ConfirmationService],
  templateUrl: "./payments.html",
})
export class Payments implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly propertyService = inject(PropertyService);
  private readonly unitService = inject(UnitService);
  private readonly feeService = inject(FeeService);
  private readonly paymentService = inject(PaymentService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly properties = signal<Property[]>([]);
  readonly selectedPropertyId = signal<string | null>(null);
  readonly units = signal<Unit[]>([]);
  readonly selectedUnitId = signal<string | null>(null);

  readonly fees = signal<Fee[]>([]);
  readonly loadingFees = signal(false);
  readonly payments = signal<Payment[]>([]);
  readonly loadingPayments = signal(false);

  readonly registerVisible = signal(false);
  readonly savingPayment = signal(false);
  readonly rejectVisible = signal(false);
  readonly rejecting = signal(false);
  private rejectTargetId: string | null = null;

  readonly registerForm = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(1)]],
    bankReference: ["", [Validators.required]],
    receiptUrl: ["", [Validators.required]],
  });

  readonly rejectForm = this.fb.nonNullable.group({
    rejectionReason: ["", [Validators.required]],
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
            this.loadUnits(first.id);
          }
        },
      });
  }

  onPropertyChange(propertyId: string): void {
    this.selectedPropertyId.set(propertyId);
    this.selectedUnitId.set(null);
    this.fees.set([]);
    this.payments.set([]);
    this.loadUnits(propertyId);
  }

  private loadUnits(propertyId: string): void {
    this.unitService
      .list(propertyId, { page: 1, pageSize: 100, sortBy: "code", sortOrder: "asc" })
      .subscribe({
        next: (res) => {
          this.units.set(res.items);
          const first = res.items[0];
          if (first) {
            this.selectedUnitId.set(first.id);
            this.loadData(first.id);
          }
        },
      });
  }

  onUnitChange(unitId: string): void {
    this.selectedUnitId.set(unitId);
    this.loadData(unitId);
  }

  private loadData(unitId: string): void {
    this.loadingFees.set(true);
    this.feeService.list({ unitId, page: 1, pageSize: 100, sortBy: "dueDate", sortOrder: "asc" }).subscribe({
      next: (res) => {
        this.fees.set(res.items);
        this.loadingFees.set(false);
      },
      error: () => this.loadingFees.set(false),
    });
    this.loadingPayments.set(true);
    this.paymentService.list({ unitId, page: 1, pageSize: 100, sortBy: "createdAt", sortOrder: "desc" }).subscribe({
      next: (res) => {
        this.payments.set(res.items);
        this.loadingPayments.set(false);
      },
      error: () => this.loadingPayments.set(false),
    });
  }

  // ===== Registrar pago =====
  openRegister(): void {
    this.registerForm.reset({ amount: 0, bankReference: "", receiptUrl: "" });
    this.registerVisible.set(true);
  }

  savePayment(): void {
    const unitId = this.selectedUnitId();
    if (this.registerForm.invalid || this.savingPayment() || !unitId) {
      this.registerForm.markAllAsTouched();
      return;
    }
    this.savingPayment.set(true);
    const v = this.registerForm.getRawValue();
    this.paymentService
      .create({
        unitId,
        amount: v.amount,
        bankReference: v.bankReference.trim(),
        receiptUrl: v.receiptUrl.trim(),
      })
      .subscribe({
        next: () => {
          this.savingPayment.set(false);
          this.registerVisible.set(false);
          this.messages.add({
            severity: "success",
            summary: "Pago registrado",
            detail: "Queda en revisión.",
          });
          this.loadData(unitId);
        },
        error: () => this.savingPayment.set(false),
      });
  }

  // ===== Aprobar / rechazar =====
  confirmApprove(payment: Payment): void {
    this.confirm.confirm({
      header: "Aprobar pago",
      message: `¿Aprobar el pago con referencia "${payment.bankReference}"? Se asignará a las cuotas pendientes más antiguas.`,
      icon: "pi pi-check-circle",
      acceptLabel: "Aprobar",
      rejectLabel: "Cancelar",
      accept: () => {
        this.paymentService.approve(payment.id).subscribe({
          next: (res) => {
            this.messages.add({
              severity: "success",
              summary: "Pago aprobado",
              detail: `${res.allocations.length} cuota(s) afectada(s).`,
            });
            const unitId = this.selectedUnitId();
            if (unitId) this.loadData(unitId);
          },
        });
      },
    });
  }

  openReject(payment: Payment): void {
    this.rejectTargetId = payment.id;
    this.rejectForm.reset({ rejectionReason: "" });
    this.rejectVisible.set(true);
  }

  submitReject(): void {
    if (this.rejectForm.invalid || this.rejecting() || !this.rejectTargetId) {
      this.rejectForm.markAllAsTouched();
      return;
    }
    this.rejecting.set(true);
    this.paymentService
      .reject(this.rejectTargetId, this.rejectForm.getRawValue().rejectionReason.trim())
      .subscribe({
        next: () => {
          this.rejecting.set(false);
          this.rejectVisible.set(false);
          this.messages.add({ severity: "success", summary: "Pago rechazado" });
          const unitId = this.selectedUnitId();
          if (unitId) this.loadData(unitId);
        },
        error: () => this.rejecting.set(false),
      });
  }
}
