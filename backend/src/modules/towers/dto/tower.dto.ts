import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateTowerDto {
  @ApiProperty({
    description: "ID de la propiedad a la que pertenece la torre",
    example: "clx123abc",
  })
  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @ApiProperty({ description: "Nombre de la torre", example: "Torre A" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: "Descripción de la torre", example: "Torre norte, 10 pisos" })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateTowerDto {
  @ApiPropertyOptional({ description: "Nombre de la torre", example: "Torre A" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: "Descripción de la torre", example: "Torre norte, 10 pisos" })
  @IsString()
  @IsOptional()
  description?: string;
}
