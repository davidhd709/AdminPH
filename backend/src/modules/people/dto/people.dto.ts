import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateOwnerDto {
  @ApiProperty({ description: "ID de la unidad asociada", example: "clx123abc" })
  @IsString()
  @IsNotEmpty()
  unitId!: string;

  @ApiPropertyOptional({ description: "ID del usuario vinculado", example: "clx456def" })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: "Estado del propietario", example: "ACTIVE" })
  @IsString()
  @IsOptional()
  status?: string;
}

export class CreateResidentDto {
  @ApiProperty({ description: "ID de la unidad asociada", example: "clx123abc" })
  @IsString()
  @IsNotEmpty()
  unitId!: string;

  @ApiPropertyOptional({ description: "ID del usuario vinculado", example: "clx456def" })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: "Estado del residente", example: "ACTIVE" })
  @IsString()
  @IsOptional()
  status?: string;
}
