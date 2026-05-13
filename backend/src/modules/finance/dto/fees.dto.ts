import { IsNotEmpty, IsOptional, IsString, IsNumber, IsDate } from "class-validator";

export class GenerateFeesDto {
  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @IsString()
  @IsNotEmpty()
  conceptId!: string;

  @IsString()
  @IsNotEmpty()
  period!: string; // Format: YYYY-MM

  @IsDate()
  @IsNotEmpty()
  dueDate!: Date;

  @IsNumber()
  @IsOptional()
  baseAmount?: number;
}

export class FeeQueryDto {
  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
