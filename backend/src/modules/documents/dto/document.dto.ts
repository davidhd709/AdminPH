import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DocumentType } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { PaginationDto } from "../../../core/dto/pagination.dto";

export class CreateDocumentDto {
  @ApiProperty({ description: "Copropiedad a la que pertenece el documento" })
  @IsUUID()
  propertyId!: string;

  @ApiProperty({ enum: DocumentType, description: "Tipo de documento" })
  @IsEnum(DocumentType)
  type!: DocumentType;

  @ApiProperty({
    description: "Título del documento",
    example: "Reglamento de Propiedad Horizontal",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ description: "Descripción del documento" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description: "Path/URL del archivo en el storage (el upload real es Fase 9)",
    example: "documents/property-1/reglamento-v1.pdf",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  fileUrl!: string;
}

export class NewDocumentVersionDto {
  @ApiProperty({
    description: "Path/URL del nuevo archivo en el storage (el upload real es Fase 9)",
    example: "documents/property-1/reglamento-v2.pdf",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  fileUrl!: string;

  @ApiPropertyOptional({ description: "Descripción de la nueva versión (opcional)" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class DocumentQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filtrar por copropiedad" })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ enum: DocumentType, description: "Filtrar por tipo de documento" })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;
}
