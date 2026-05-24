import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../core/dto/pagination.dto";

/**
 * Query de listado de torres: paginación + la copropiedad cuya lista se pide.
 * `propertyId` es obligatorio (las torres siempre se listan dentro de una
 * copropiedad; además habilita la validación de acceso por tenant).
 */
export class TowerQueryDto extends PaginationDto {
  @ApiProperty({ description: "ID de la copropiedad cuyas torres se listan" })
  @IsString()
  @IsNotEmpty()
  propertyId!: string;
}

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
