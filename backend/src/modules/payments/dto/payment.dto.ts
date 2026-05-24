import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsNumber, IsDate } from "class-validator";

export class CreatePaymentDto {
  @ApiProperty({ description: "ID de la unidad que realiza el pago", example: "clx123abc" })
  @IsString()
  @IsNotEmpty()
  unitId!: string;

  @ApiProperty({ description: "Monto del pago", example: 150000 })
  @IsNumber()
  @IsNotEmpty()
  amount!: number;

  @ApiPropertyOptional({ description: "Nombre del banco", example: "Bancolombia" })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiProperty({ description: "Referencia bancaria del pago", example: "REF-2026-0001" })
  @IsString()
  @IsNotEmpty()
  bankReference!: string;

  @ApiPropertyOptional({ description: "Fecha del pago", example: "2026-05-10T00:00:00.000Z" })
  @IsDate()
  @IsOptional()
  paymentDate?: Date;

  @ApiProperty({
    description: "URL del comprobante de pago",
    example: "https://cdn.example.com/recibos/abc.pdf",
  })
  @IsString()
  @IsNotEmpty()
  receiptUrl!: string;
}

export class ApprovePaymentDto {
  @ApiProperty({ description: "ID del pago a aprobar", example: "clx123abc" })
  @IsString()
  @IsNotEmpty()
  paymentId!: string;

  @ApiPropertyOptional({
    description: "JSON con asignaciones manuales (si aplica)",
    example: '[{"feeId":"clx456def","amount":50000}]',
  })
  @IsOptional()
  @IsString()
  manualAllocations?: string; // JSON string of allocations if manual
}

export class RejectPaymentDto {
  @ApiProperty({ description: "ID del pago a rechazar", example: "clx123abc" })
  @IsString()
  @IsNotEmpty()
  paymentId!: string;

  @ApiProperty({ description: "Motivo del rechazo", example: "Comprobante ilegible" })
  @IsString()
  @IsNotEmpty()
  rejectionReason!: string;
}
