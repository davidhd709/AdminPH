import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean, IsEnum } from "class-validator";
import { InterestType } from "@prisma/client";

export class CreateLateFeeConfigDto {
  @ApiProperty({ description: "ID de la propiedad", example: "clx123abc" })
  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @ApiProperty({ description: "Tasa de interés a aplicar", example: 2.5 })
  @IsNumber()
  @IsNotEmpty()
  interestRate!: number;

  @ApiProperty({ description: "Tipo de interés", enum: InterestType })
  @IsEnum(InterestType)
  @IsNotEmpty()
  interestType!: InterestType;

  @ApiPropertyOptional({ description: "Días de gracia antes de aplicar interés", example: 5 })
  @IsNumber()
  @IsOptional()
  graceDays?: number;

  @ApiPropertyOptional({ description: "Si la configuración está activa", example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateLateFeeConfigDto {
  @ApiPropertyOptional({ description: "Tasa de interés a aplicar", example: 2.5 })
  @IsNumber()
  @IsOptional()
  interestRate?: number;

  @ApiPropertyOptional({ description: "Tipo de interés", enum: InterestType })
  @IsEnum(InterestType)
  @IsOptional()
  interestType?: InterestType;

  @ApiPropertyOptional({ description: "Días de gracia antes de aplicar interés", example: 5 })
  @IsNumber()
  @IsOptional()
  graceDays?: number;

  @ApiPropertyOptional({ description: "Si la configuración está activa", example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
