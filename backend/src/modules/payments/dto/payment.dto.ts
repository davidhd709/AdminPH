import { IsNotEmpty, IsOptional, IsString, IsNumber, IsDate } from "class-validator";

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  unitId!: string;

  @IsNumber()
  @IsNotEmpty()
  amount!: number;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsNotEmpty()
  bankReference!: string;

  @IsDate()
  @IsOptional()
  paymentDate?: Date;

  @IsString()
  @IsNotEmpty()
  receiptUrl!: string;
}

export class ApprovePaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentId!: string;

  @IsOptional()
  @IsString()
  manualAllocations?: string; // JSON string of allocations if manual
}

export class RejectPaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentId!: string;

  @IsString()
  @IsNotEmpty()
  rejectionReason!: string;
}
