import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../core/dto/pagination.dto";

/**
 * Query de listado de usuarios: paginación + búsqueda libre.
 * `search` filtra por nombre, email o documento (case-insensitive). Pensado
 * para selectores (ej. vincular un usuario a un propietario/residente).
 */
export class UserQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Texto a buscar en nombre, email o documento" })
  @IsOptional()
  @IsString()
  search?: string;
}
