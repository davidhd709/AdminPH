import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateCompanyDto {
  @ApiProperty({ description: "Nombre de la empresa", example: "Constructora Acme S.A.S." })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: "NIT de la empresa", example: "900123456-7" })
  @IsString()
  @IsOptional()
  nit?: string;
}

export class UpdateCompanyDto {
  @ApiPropertyOptional({ description: "Nombre de la empresa", example: "Constructora Acme S.A.S." })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: "NIT de la empresa", example: "900123456-7" })
  @IsString()
  @IsOptional()
  nit?: string;
}
