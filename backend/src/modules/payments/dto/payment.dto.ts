import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsNumber } from "class-validator";
import { PaginationDto } from "../../../core/dto/pagination.dto";

/** Query de listado de pagos: paginación + filtros opcionales por unidad/estado. */
export class PaymentQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filtrar por ID de unidad" })
  @IsOptional()
  @IsString()
  unitId?: string;

  @ApiPropertyOptional({ description: "Filtrar por estado", example: "PENDING_REVIEW" })
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreatePaymentDto {
  @ApiProperty({ description: "ID de la unidad que realiza el pago", example: "clx123abc" })
  @IsString()
  @IsNotEmpty()
  unitId!: string;

  @ApiProperty({ description: "Monto del pago", example: 150000 })
  @IsNumber()
  @IsNotEmpty()
  amount!: number;

  @ApiProperty({ description: "Referencia bancaria del pago", example: "REF-2026-0001" })
  @IsString()
  @IsNotEmpty()
  bankReference!: string;

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
