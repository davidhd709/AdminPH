import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VisitorType } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { PaginationDto } from "../../../core/dto/pagination.dto";

export class CreateVisitorDto {
  @ApiProperty({ description: "Copropiedad donde se registra el ingreso" })
  @IsUUID()
  propertyId!: string;

  @ApiPropertyOptional({ description: "Unidad destino del visitante (opcional)" })
  @IsOptional()
  @IsUUID()
  unitId?: string;

  @ApiProperty({ description: "Nombre completo del visitante", example: "Juan Pérez" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @ApiPropertyOptional({ description: "Documento de identidad (opcional)" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  document?: string;

  @ApiPropertyOptional({
    enum: VisitorType,
    description: "Tipo de visitante",
    default: VisitorType.VISITOR,
  })
  @IsOptional()
  @IsEnum(VisitorType)
  type?: VisitorType;

  @ApiPropertyOptional({ description: "Notas u observaciones (opcional)" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class VisitorQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filtrar por copropiedad" })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ enum: VisitorType, description: "Filtrar por tipo de visitante" })
  @IsOptional()
  @IsEnum(VisitorType)
  type?: VisitorType;
}
