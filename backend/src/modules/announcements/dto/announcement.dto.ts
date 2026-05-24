import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AnnouncementScope } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateAnnouncementDto {
  @ApiProperty({ description: "Copropiedad a la que pertenece el comunicado" })
  @IsUUID()
  propertyId!: string;

  @ApiProperty({ enum: AnnouncementScope, description: "Alcance del comunicado" })
  @IsEnum(AnnouncementScope)
  scope!: AnnouncementScope;

  @ApiPropertyOptional({ description: "Torre destino (requerido si scope=TOWER)" })
  @IsOptional()
  @IsUUID()
  towerId?: string;

  @ApiPropertyOptional({ description: "Unidad destino (requerido si scope=UNIT)" })
  @IsOptional()
  @IsUUID()
  unitId?: string;

  @ApiProperty({ description: "Título del comunicado", example: "Corte de agua programado" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ description: "Cuerpo del comunicado" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  body!: string;
}

export class AnnouncementQueryDto {
  @ApiPropertyOptional({ description: "Filtrar por copropiedad" })
  @IsOptional()
  @IsUUID()
  propertyId?: string;
}
