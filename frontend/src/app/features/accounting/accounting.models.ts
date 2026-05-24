export type TransactionType = "INCOME" | "EXPENSE";

export interface BankAccount {
  id: string;
  companyId: string;
  propertyId: string;
  name: string;
  bank: string;
  accountNumber: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingCategory {
  id: string;
  companyId: string;
  propertyId: string;
  name: string;
  type: TransactionType;
  createdAt: string;
  updatedAt: string;
}

/** Movimiento contable. `amount` es Decimal del backend → string en JSON. */
export interface Transaction {
  id: string;
  companyId: string;
  propertyId: string;
  bankAccountId: string | null;
  categoryId: string | null;
  createdById: string;
  type: TransactionType;
  amount: string;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBankAccountPayload {
  propertyId: string;
  name: string;
  bank: string;
  accountNumber: string;
}

export interface CreateCategoryPayload {
  propertyId: string;
  name: string;
  type: TransactionType;
}

export interface CreateTransactionPayload {
  propertyId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  categoryId?: string;
  bankAccountId?: string;
}

export const TRANSACTION_TYPE_OPTIONS: { label: string; value: TransactionType }[] = [
  { label: "Ingreso", value: "INCOME" },
  { label: "Egreso", value: "EXPENSE" },
];
