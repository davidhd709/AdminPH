import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsNumber, IsDate } from "class-validator";

export class GenerateFeesDto {
  @ApiProperty({ description: "ID de la propiedad", example: "clx123abc" })
  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @ApiProperty({ description: "ID del concepto de cobro", example: "clx456def" })
  @IsString()
  @IsNotEmpty()
  conceptId!: string;

  @ApiProperty({ description: "Periodo en formato YYYY-MM", example: "2026-05" })
  @IsString()
  @IsNotEmpty()
  period!: string; // Format: YYYY-MM

  @ApiProperty({ description: "Fecha de vencimiento", example: "2026-05-15T00:00:00.000Z" })
  @IsDate()
  @IsNotEmpty()
  dueDate!: Date;

  @ApiPropertyOptional({ description: "Monto base a aplicar (opcional)", example: 150000 })
  @IsNumber()
  @IsOptional()
  baseAmount?: number;
}

export class FeeQueryDto {
  @ApiPropertyOptional({ description: "Filtrar por ID de unidad", example: "clx123abc" })
  @IsOptional()
  @IsString()
  unitId?: string;

  @ApiPropertyOptional({ description: "Filtrar por periodo (YYYY-MM)", example: "2026-05" })
  @IsOptional()
  @IsString()
  period?: string;

  @ApiPropertyOptional({ description: "Filtrar por estado", example: "PENDING" })
  @IsOptional()
  @IsString()
  status?: string;
}
