import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VehicleType } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreatePetDto {
  @ApiProperty({ description: "Unidad a la que pertenece la mascota" })
  @IsUUID()
  unitId!: string;

  @ApiProperty({ description: "Nombre de la mascota", example: "Firulais" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @ApiProperty({ description: "Especie", example: "perro" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  species!: string;

  @ApiPropertyOptional({ description: "Raza (opcional)", example: "Labrador" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  breed?: string;

  @ApiPropertyOptional({ description: "Notas adicionales (opcional)" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CreateVehicleDto {
  @ApiProperty({ description: "Unidad a la que pertenece el vehículo" })
  @IsUUID()
  unitId!: string;

  @ApiProperty({ description: "Placa del vehículo", example: "ABC123" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  plate!: string;

  @ApiPropertyOptional({
    enum: VehicleType,
    description: "Tipo de vehículo (default CAR)",
    default: VehicleType.CAR,
  })
  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;

  @ApiPropertyOptional({ description: "Marca (opcional)", example: "Toyota" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  brand?: string;

  @ApiPropertyOptional({ description: "Color (opcional)", example: "Rojo" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  color?: string;

  @ApiPropertyOptional({ description: "Parqueadero asignado (opcional)", example: "P-12" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  parkingSpot?: string;
}

export class RegistryQueryDto {
  @ApiPropertyOptional({ description: "Filtrar por unidad" })
  @IsOptional()
  @IsUUID()
  unitId?: string;

  @ApiPropertyOptional({ description: "Filtrar por copropiedad" })
  @IsOptional()
  @IsUUID()
  propertyId?: string;
}
