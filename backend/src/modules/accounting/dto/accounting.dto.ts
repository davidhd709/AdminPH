import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class CreateBankAccountDto {
  @ApiProperty({ description: "Copropiedad a la que pertenece la cuenta bancaria" })
  @IsUUID()
  propertyId!: string;

  @ApiProperty({
    description: "Nombre interno de la cuenta",
    example: "Cuenta de ahorros principal",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ description: "Entidad bancaria", example: "Bancolombia" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bank!: string;

  @ApiProperty({ description: "Número de cuenta", example: "1234567890" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  accountNumber!: string;
}

export class CreateCategoryDto {
  @ApiProperty({ description: "Copropiedad a la que pertenece la categoría" })
  @IsUUID()
  propertyId!: string;

  @ApiProperty({
    description: "Nombre de la categoría contable",
    example: "Mantenimiento ascensores",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ enum: TransactionType, description: "Tipo: INCOME o EXPENSE" })
  @IsEnum(TransactionType)
  type!: TransactionType;
}

export class CreateTransactionDto {
  @ApiProperty({ description: "Copropiedad a la que pertenece el movimiento" })
  @IsUUID()
  propertyId!: string;

  @ApiPropertyOptional({ description: "Cuenta bancaria asociada (opcional)" })
  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @ApiPropertyOptional({ description: "Categoría contable asociada (opcional)" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ enum: TransactionType, description: "Tipo: INCOME o EXPENSE" })
  @IsEnum(TransactionType)
  type!: TransactionType;

  @ApiProperty({ description: "Monto del movimiento (positivo)", example: 150000.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: "Descripción del movimiento", example: "Pago factura energía" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ description: "Fecha del movimiento (ISO 8601)", example: "2026-05-24" })
  @IsDateString()
  date!: string;
}

export class CreateBudgetItemDto {
  @ApiProperty({ description: "Categoría contable del ítem presupuestal" })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ description: "Monto planeado para la categoría", example: 5000000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  plannedAmount!: number;
}

export class CreateBudgetDto {
  @ApiProperty({ description: "Copropiedad a la que pertenece el presupuesto" })
  @IsUUID()
  propertyId!: string;

  @ApiProperty({ description: "Año del presupuesto", example: 2026 })
  @IsInt()
  @Min(2020)
  @Max(2100)
  year!: number;

  @ApiPropertyOptional({
    type: [CreateBudgetItemDto],
    description: "Ítems presupuestales por categoría (opcional)",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBudgetItemDto)
  items?: CreateBudgetItemDto[];
}

export class TransactionQueryDto {
  @ApiPropertyOptional({ description: "Filtrar por copropiedad" })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ enum: TransactionType, description: "Filtrar por tipo" })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ description: "Filtrar por categoría" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
