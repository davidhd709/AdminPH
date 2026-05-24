import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsNumber } from "class-validator";

export class CreatePropertyDto {
  @ApiProperty({ description: "ID de la empresa propietaria", example: "clx123abc" })
  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @ApiProperty({ description: "Nombre del conjunto/propiedad", example: "Conjunto Los Robles" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: "NIT de la propiedad", example: "901234567-8" })
  @IsString()
  @IsOptional()
  nit?: string;

  @ApiProperty({ description: "Dirección física", example: "Calle 123 #45-67" })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ description: "Ciudad", example: "Bogotá" })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ description: "Departamento", example: "Cundinamarca" })
  @IsString()
  @IsNotEmpty()
  department!: string;

  @ApiPropertyOptional({ description: "Teléfono de contacto", example: "6011234567" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: "Email de contacto", example: "admin@losrobles.com" })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: "Coeficiente total de la propiedad", example: 100 })
  @IsNumber()
  @IsNotEmpty()
  coefficientTotal!: number;
}

export class UpdatePropertyDto {
  @ApiPropertyOptional({
    description: "Nombre del conjunto/propiedad",
    example: "Conjunto Los Robles",
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: "NIT de la propiedad", example: "901234567-8" })
  @IsString()
  @IsOptional()
  nit?: string;

  @ApiPropertyOptional({ description: "Dirección física", example: "Calle 123 #45-67" })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: "Ciudad", example: "Bogotá" })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: "Departamento", example: "Cundinamarca" })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ description: "Teléfono de contacto", example: "6011234567" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: "Email de contacto", example: "admin@losrobles.com" })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: "Coeficiente total de la propiedad", example: 100 })
  @IsNumber()
  @IsOptional()
  coefficientTotal?: number;
}
