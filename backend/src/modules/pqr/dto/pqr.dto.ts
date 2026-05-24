import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PqrCategory, PqrStatus } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { PaginationDto } from "../../../core/dto/pagination.dto";

export class CreatePqrDto {
  @ApiProperty({ description: "Copropiedad a la que pertenece la PQR" })
  @IsUUID()
  propertyId!: string;

  @ApiPropertyOptional({ description: "Unidad relacionada (opcional)" })
  @IsOptional()
  @IsUUID()
  unitId?: string;

  @ApiProperty({ enum: PqrCategory, description: "Categoría de la solicitud" })
  @IsEnum(PqrCategory)
  category!: PqrCategory;

  @ApiProperty({ description: "Asunto", example: "Daño en zona común" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ description: "Descripción detallada" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description!: string;
}

export class UpdatePqrStatusDto {
  @ApiProperty({ enum: PqrStatus, description: "Nuevo estado" })
  @IsEnum(PqrStatus)
  status!: PqrStatus;
}

export class RespondPqrDto {
  @ApiProperty({ description: "Mensaje de respuesta" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string;
}

export class PqrQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filtrar por copropiedad" })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ enum: PqrStatus, description: "Filtrar por estado" })
  @IsOptional()
  @IsEnum(PqrStatus)
  status?: PqrStatus;

  @ApiPropertyOptional({ enum: PqrCategory, description: "Filtrar por categoría" })
  @IsOptional()
  @IsEnum(PqrCategory)
  category?: PqrCategory;
}
