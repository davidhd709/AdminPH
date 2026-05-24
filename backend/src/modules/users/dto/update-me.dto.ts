import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

/** Campos que el propio usuario puede editar de su perfil. */
export class UpdateMeDto {
  @ApiPropertyOptional({ description: "Nombre completo", example: "Juan Pérez" })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;

  @ApiPropertyOptional({ description: "Teléfono", example: "3001234567" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
