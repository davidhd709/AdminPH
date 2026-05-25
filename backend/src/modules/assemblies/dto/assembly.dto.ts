import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AssemblyStatus, AssemblyType, VoteChoice, VotingType } from "@prisma/client";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { PaginationDto } from "../../../core/dto/pagination.dto";

export class CreateAssemblyDto {
  @ApiProperty({ description: "Copropiedad a la que pertenece la asamblea" })
  @IsUUID()
  propertyId!: string;

  @ApiProperty({ description: "Título de la asamblea", example: "Asamblea ordinaria 2026" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ enum: AssemblyType, description: "Tipo de asamblea" })
  @IsOptional()
  @IsEnum(AssemblyType)
  type?: AssemblyType;

  @ApiPropertyOptional({ description: "Orden del día / agenda" })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  agenda?: string;

  @ApiProperty({ description: "Fecha y hora programada (ISO 8601)" })
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional({ description: "Quórum requerido (%)", minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  quorumPercent?: number;
}

export class UpdateAssemblyStatusDto {
  @ApiProperty({ enum: AssemblyStatus, description: "Nuevo estado de la asamblea" })
  @IsEnum(AssemblyStatus)
  status!: AssemblyStatus;
}

export class RegisterAttendanceDto {
  @ApiProperty({ description: "Unidad cuya asistencia se registra" })
  @IsUUID()
  unitId!: string;

  @ApiPropertyOptional({ description: "¿Presente?", default: true })
  @IsOptional()
  @IsBoolean()
  present?: boolean;

  @ApiPropertyOptional({ description: "Usuario apoderado (poder/representación)" })
  @IsOptional()
  @IsUUID()
  proxyUserId?: string;
}

export class CreateVotingDto {
  @ApiProperty({ description: "Pregunta a votar", example: "¿Aprueba el presupuesto?" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  question!: string;

  @ApiPropertyOptional({ enum: VotingType, description: "Tipo de conteo de la votación" })
  @IsOptional()
  @IsEnum(VotingType)
  type?: VotingType;
}

export class CastVoteDto {
  @ApiProperty({ description: "Unidad que emite el voto" })
  @IsUUID()
  unitId!: string;

  @ApiProperty({ enum: VoteChoice, description: "Sentido del voto" })
  @IsEnum(VoteChoice)
  choice!: VoteChoice;
}

export class AssemblyQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filtrar por copropiedad" })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ enum: AssemblyStatus, description: "Filtrar por estado" })
  @IsOptional()
  @IsEnum(AssemblyStatus)
  status?: AssemblyStatus;

  @ApiPropertyOptional({ enum: AssemblyType, description: "Filtrar por tipo" })
  @IsOptional()
  @IsEnum(AssemblyType)
  type?: AssemblyType;
}
