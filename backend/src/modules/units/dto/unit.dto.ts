import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsNumber } from "class-validator";

export class CreateUnitDto {
  @ApiProperty({ description: "ID de la propiedad", example: "clx123abc" })
  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @ApiPropertyOptional({ description: "ID de la torre (si aplica)", example: "clx456def" })
  @IsString()
  @IsOptional()
  towerId?: string;

  @ApiProperty({ description: "Código único de la unidad", example: "A-101" })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ description: "Piso de la unidad", example: 1 })
  @IsNumber()
  @IsNotEmpty()
  floor!: number;

  @ApiProperty({ description: "Número de la unidad", example: "101" })
  @IsString()
  @IsNotEmpty()
  number!: string;

  @ApiProperty({ description: "Área en metros cuadrados", example: 75.5 })
  @IsNumber()
  @IsNotEmpty()
  area!: number;

  @ApiProperty({ description: "Coeficiente de copropiedad", example: 1.25 })
  @IsNumber()
  @IsNotEmpty()
  coefficient!: number;
}

export class UpdateUnitDto {
  @ApiPropertyOptional({ description: "ID de la torre (si aplica)", example: "clx456def" })
  @IsString()
  @IsOptional()
  towerId?: string;

  @ApiPropertyOptional({ description: "Código único de la unidad", example: "A-101" })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: "Piso de la unidad", example: 1 })
  @IsNumber()
  @IsOptional()
  floor?: number;

  @ApiPropertyOptional({ description: "Número de la unidad", example: "101" })
  @IsString()
  @IsOptional()
  number?: string;

  @ApiPropertyOptional({ description: "Área en metros cuadrados", example: 75.5 })
  @IsNumber()
  @IsOptional()
  area?: number;

  @ApiPropertyOptional({ description: "Coeficiente de copropiedad", example: 1.25 })
  @IsNumber()
  @IsOptional()
  coefficient?: number;
}
