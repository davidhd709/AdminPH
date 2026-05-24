import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ReservationStatus } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { PaginationDto } from "../../../core/dto/pagination.dto";

/** Query de listado de zonas comunes: paginación + copropiedad (requerida). */
export class AreaListQueryDto extends PaginationDto {
  @ApiProperty({ description: "Copropiedad cuyas zonas comunes se listan" })
  @IsUUID()
  propertyId!: string;
}

export class CreateCommonAreaDto {
  @ApiProperty({ description: "Copropiedad a la que pertenece la zona común" })
  @IsUUID()
  propertyId!: string;

  @ApiProperty({ description: "Nombre de la zona común", example: "Salón social" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ description: "Descripción de la zona común" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class CreateReservationDto {
  @ApiProperty({ description: "Zona común a reservar" })
  @IsUUID()
  commonAreaId!: string;

  @ApiPropertyOptional({ description: "Unidad solicitante (opcional)" })
  @IsOptional()
  @IsUUID()
  unitId?: string;

  @ApiProperty({ description: "Inicio de la reserva (ISO 8601)", example: "2026-06-01T18:00:00Z" })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ description: "Fin de la reserva (ISO 8601)", example: "2026-06-01T22:00:00Z" })
  @IsDateString()
  endTime!: string;

  @ApiPropertyOptional({ description: "Notas de la solicitud" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

/** Estados válidos al revisar una reserva pendiente. */
export type ReviewableStatus = "APPROVED" | "REJECTED";

export class ReviewReservationDto {
  @ApiProperty({
    enum: ["APPROVED", "REJECTED"],
    description: "Resultado de la revisión: aprobar o rechazar",
  })
  @IsIn(["APPROVED", "REJECTED"])
  status!: ReviewableStatus;
}

export class ReservationQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filtrar por copropiedad" })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ description: "Filtrar por zona común" })
  @IsOptional()
  @IsUUID()
  commonAreaId?: string;

  @ApiPropertyOptional({ enum: ReservationStatus, description: "Filtrar por estado" })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;
}
