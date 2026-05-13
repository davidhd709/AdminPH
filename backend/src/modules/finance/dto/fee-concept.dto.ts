import { IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean, IsEnum } from "class-validator";

export enum FeeConceptType {
  ADMINISTRATION = "ADMINISTRATION",
  EXTRAORDINARY = "EXTRAORDINARY",
  FINE = "FINE",
  INTEREST = "INTEREST",
  PARKING = "PARKING",
  OTHER = "OTHER",
}

export enum CalculationType {
  FIXED = "FIXED",
  COEFFICIENT = "COEFFICIENT",
}

export class CreateFeeConceptDto {
  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(FeeConceptType)
  @IsNotEmpty()
  type!: FeeConceptType;

  @IsEnum(CalculationType)
  @IsNotEmpty()
  calculationType!: CalculationType;

  @IsNumber()
  @IsNotEmpty()
  defaultAmount!: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateFeeConceptDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(FeeConceptType)
  @IsOptional()
  type?: FeeConceptType;

  @IsEnum(CalculationType)
  @IsOptional()
  calculationType?: CalculationType;

  @IsNumber()
  @IsOptional()
  defaultAmount?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
