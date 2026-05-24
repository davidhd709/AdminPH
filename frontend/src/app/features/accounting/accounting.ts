import { CurrencyPipe, DatePipe } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { InputNumberModule } from "primeng/inputnumber";
import { SelectModule } from "primeng/select";
import { DatePickerModule } from "primeng/datepicker";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { ConfirmationService, MessageService } from "primeng/api";

import { PageHeader } from "../../shared/components/page-header/page-header";
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { PropertyService } from "../properties/property.service";
import { Property } from "../properties/property.models";
import { AccountingService } from "./accounting.service";
import {
  AccountingCategory,
  BankAccount,
  TRANSACTION_TYPE_OPTIONS,
  Transaction,
  TransactionType,
} from "./accounting.models";

/**
 * Contabilidad por copropiedad (Finanzas). Tres bloques scoped a la copropiedad
 * elegida: movimientos (ingresos/egresos, crear+eliminar), categorías y cuentas
 * bancarias (crear+listar). El backend no expone edición/borrado de categorías
 * ni cuentas, así que solo se listan y crean.
 */
@Component({
  selector: "app-accounting",
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
    SelectModule,
    DatePickerModule,
    ConfirmDialogModule,
    PageHeader,
    EmptyState,
  ],
  providers: [ConfirmationService],
  templateUrl: "./accounting.html",
})
export class Accounting implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AccountingService);
  private readonly propertyService = inject(PropertyService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly typeOptions = TRANSACTION_TYPE_OPTIONS;

  readonly properties = signal<Property[]>([]);
  readonly selectedPropertyId = signal<string | null>(null);

  readonly transactions = signal<Transaction[]>([]);
  readonly loadingTx = signal(false);
  readonly categories = signal<AccountingCategory[]>([]);
  readonly bankAccounts = signal<BankAccount[]>([]);

  private readonly categoryById = computed(
    () => new Map(this.categories().map((c) => [c.id, c.name])),
  );

  // Diálogos
  readonly txVisible = signal(false);
  readonly savingTx = signal(false);
  readonly catVisible = signal(false);
  readonly savingCat = signal(false);
  readonly bankVisible = signal(false);
  readonly savingBank = signal(false);

  readonly txForm = this.fb.nonNullable.group({
    type: ["EXPENSE" as TransactionType, [Validators.required]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    description: ["", [Validators.required, Validators.maxLength(500)]],
    date: [new Date(), [Validators.required]],
    categoryId: this.fb.control<string | null>(null),
    bankAccountId: this.fb.control<string | null>(null),
  });

  readonly catForm = this.fb.nonNullable.group({
    name: ["", [Validators.required, Validators.maxLength(150)]],
    type: ["EXPENSE" as TransactionType, [Validators.required]],
  });

  readonly bankForm = this.fb.nonNullable.group({
    name: ["", [Validators.required, Validators.maxLength(150)]],
    bank: ["", [Validators.required, Validators.maxLength(100)]],
    accountNumber: ["", [Validators.required, Validators.maxLength(50)]],
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
            this.loadAll(first.id);
          }
        },
      });
  }

  onPropertyChange(propertyId: string): void {
    this.selectedPropertyId.set(propertyId);
    this.loadAll(propertyId);
  }

  private loadAll(propertyId: string): void {
    this.loadTransactions(propertyId);
    this.service.listCategories(propertyId, { page: 1, pageSize: 100, sortBy: "name", sortOrder: "asc" }).subscribe({
      next: (res) => this.categories.set(res.items),
    });
    this.service.listBankAccounts(propertyId, { page: 1, pageSize: 100, sortBy: "name", sortOrder: "asc" }).subscribe({
      next: (res) => this.bankAccounts.set(res.items),
    });
  }

  private loadTransactions(propertyId: string): void {
    this.loadingTx.set(true);
    this.service.listTransactions({ propertyId, page: 1, pageSize: 100, sortBy: "date", sortOrder: "desc" }).subscribe({
      next: (res) => {
        this.transactions.set(res.items);
        this.loadingTx.set(false);
      },
      error: () => this.loadingTx.set(false),
    });
  }

  categoryName(id: string | null): string {
    return id ? (this.categoryById().get(id) ?? "—") : "—";
  }

  // ===== Movimiento =====
  openTx(): void {
    this.txForm.reset({
      type: "EXPENSE",
      amount: 0,
      description: "",
      date: new Date(),
      categoryId: null,
      bankAccountId: null,
    });
    this.txVisible.set(true);
  }

  saveTx(): void {
    const propertyId = this.selectedPropertyId();
    if (this.txForm.invalid || this.savingTx() || !propertyId) {
      this.txForm.markAllAsTouched();
      return;
    }
    this.savingTx.set(true);
    const v = this.txForm.getRawValue();
    this.service
      .createTransaction({
        propertyId,
        type: v.type,
        amount: v.amount,
        description: v.description.trim(),
        date: v.date.toISOString(),
        categoryId: v.categoryId ?? undefined,
        bankAccountId: v.bankAccountId ?? undefined,
      })
      .subscribe({
        next: () => {
          this.savingTx.set(false);
          this.txVisible.set(false);
          this.messages.add({ severity: "success", summary: "Movimiento registrado" });
          this.loadTransactions(propertyId);
        },
        error: () => this.savingTx.set(false),
      });
  }

  confirmDeleteTx(tx: Transaction): void {
    this.confirm.confirm({
      header: "Eliminar movimiento",
      message: `¿Eliminar el movimiento "${tx.description}"?`,
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Eliminar",
      rejectLabel: "Cancelar",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => {
        this.service.removeTransaction(tx.id).subscribe({
          next: () => {
            this.messages.add({ severity: "success", summary: "Movimiento eliminado" });
            const propertyId = this.selectedPropertyId();
            if (propertyId) this.loadTransactions(propertyId);
          },
        });
      },
    });
  }

  // ===== Categoría =====
  openCat(): void {
    this.catForm.reset({ name: "", type: "EXPENSE" });
    this.catVisible.set(true);
  }

  saveCat(): void {
    const propertyId = this.selectedPropertyId();
    if (this.catForm.invalid || this.savingCat() || !propertyId) {
      this.catForm.markAllAsTouched();
      return;
    }
    this.savingCat.set(true);
    const v = this.catForm.getRawValue();
    this.service.createCategory({ propertyId, name: v.name.trim(), type: v.type }).subscribe({
      next: () => {
        this.savingCat.set(false);
        this.catVisible.set(false);
        this.messages.add({ severity: "success", summary: "Categoría creada", detail: v.name });
        this.service.listCategories(propertyId, { page: 1, pageSize: 100, sortBy: "name", sortOrder: "asc" }).subscribe({
          next: (res) => this.categories.set(res.items),
        });
      },
      error: () => this.savingCat.set(false),
    });
  }

  // ===== Cuenta bancaria =====
  openBank(): void {
    this.bankForm.reset({ name: "", bank: "", accountNumber: "" });
    this.bankVisible.set(true);
  }

  saveBank(): void {
    const propertyId = this.selectedPropertyId();
    if (this.bankForm.invalid || this.savingBank() || !propertyId) {
      this.bankForm.markAllAsTouched();
      return;
    }
    this.savingBank.set(true);
    const v = this.bankForm.getRawValue();
    this.service
      .createBankAccount({
        propertyId,
        name: v.name.trim(),
        bank: v.bank.trim(),
        accountNumber: v.accountNumber.trim(),
      })
      .subscribe({
        next: () => {
          this.savingBank.set(false);
          this.bankVisible.set(false);
          this.messages.add({ severity: "success", summary: "Cuenta creada", detail: v.name });
          this.service.listBankAccounts(propertyId, { page: 1, pageSize: 100, sortBy: "name", sortOrder: "asc" }).subscribe({
            next: (res) => this.bankAccounts.set(res.items),
          });
        },
        error: () => this.savingBank.set(false),
      });
  }
}
