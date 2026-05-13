import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
} from "class-validator";

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @IsString()
  @IsOptional()
  towerId?: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  @IsNotEmpty()
  floor: number;

  @IsString()
  @IsNotEmpty()
  number: string;

  @IsNumber()
  @IsNotEmpty()
  area: number;

  @IsNumber()
  @IsNotEmpty()
  coefficient: number;
}

export class UpdateUnitDto {
  @IsString()
  @IsOptional()
  towerId?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsNumber()
  @IsOptional()
  floor?: number;

  @IsString()
  @IsOptional()
  number?: string;

  @IsNumber()
  @IsOptional()
  area?: number;

  @IsNumber()
  @IsOptional()
  coefficient?: number;
}
