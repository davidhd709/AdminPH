import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, IsNumber, IsDate } from "class-validator";
import { PaginationDto } from "../../../core/dto/pagination.dto";

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

  // @Type convierte la string ISO del JSON en Date para que @IsDate valide
  // (el ValidationPipe usa enableImplicitConversion:false).
  @ApiProperty({ description: "Fecha de vencimiento", example: "2026-05-15T00:00:00.000Z" })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  dueDate!: Date;

  @ApiPropertyOptional({ description: "Monto base a aplicar (opcional)", example: 150000 })
  @IsNumber()
  @IsOptional()
  baseAmount?: number;
}

/**
 * Query de listado de cuotas: paginación + filtros. Extiende PaginationDto para
 * que un único `@Query()` valide ambos (con forbidNonWhitelisted, dos @Query
 * con DTOs distintos se rechazan mutuamente).
 */
export class FeeQueryDto extends PaginationDto {
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
