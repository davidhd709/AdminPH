import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean, IsEnum } from "class-validator";

/**
 * Query de listado de conceptos: la copropiedad cuyos conceptos se piden.
 * `propertyId` es obligatorio (los conceptos son por copropiedad; además
 * habilita la validación de acceso por tenant en el service).
 */
export class FeeConceptQueryDto {
  @ApiProperty({ description: "ID de la copropiedad cuyos conceptos se listan" })
  @IsString()
  @IsNotEmpty()
  propertyId!: string;
}

export enum FeeConceptType {
  ADMINISTRATION = "ADMINISTRATION",
  EXTRAORDINARY = "EXTRAORDINARY",
  FINE = "FINE",
  INTEREST = "INTEREST",
  PARKING = "PARKING",
  OTHER = "OTHER",
}

export enum CalculationType {
  FIXED = "FIXED",
  COEFFICIENT = "COEFFICIENT",
}

export class CreateFeeConceptDto {
  @ApiProperty({ description: "ID de la propiedad", example: "clx123abc" })
  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @ApiProperty({ description: "Nombre del concepto de cobro", example: "Administración" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: "Descripción del concepto",
    example: "Cuota mensual ordinaria",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: "Tipo de concepto", enum: FeeConceptType })
  @IsEnum(FeeConceptType)
  @IsNotEmpty()
  type!: FeeConceptType;

  @ApiProperty({ description: "Tipo de cálculo", enum: CalculationType })
  @IsEnum(CalculationType)
  @IsNotEmpty()
  calculationType!: CalculationType;

  @ApiProperty({ description: "Monto por defecto del concepto", example: 150000 })
  @IsNumber()
  @IsNotEmpty()
  defaultAmount!: number;

  @ApiPropertyOptional({ description: "Si el concepto está activo", example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateFeeConceptDto {
  @ApiPropertyOptional({ description: "Nombre del concepto de cobro", example: "Administración" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: "Descripción del concepto",
    example: "Cuota mensual ordinaria",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: "Tipo de concepto", enum: FeeConceptType })
  @IsEnum(FeeConceptType)
  @IsOptional()
  type?: FeeConceptType;

  @ApiPropertyOptional({ description: "Tipo de cálculo", enum: CalculationType })
  @IsEnum(CalculationType)
  @IsOptional()
  calculationType?: CalculationType;

  @ApiPropertyOptional({ description: "Monto por defecto del concepto", example: 150000 })
  @IsNumber()
  @IsOptional()
  defaultAmount?: number;

  @ApiPropertyOptional({ description: "Si el concepto está activo", example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
