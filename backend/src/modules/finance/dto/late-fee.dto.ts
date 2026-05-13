import { IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean, IsEnum } from "class-validator";
import { InterestType } from "@prisma/client";

export class CreateLateFeeConfigDto {
  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @IsNumber()
  @IsNotEmpty()
  interestRate!: number;

  @IsEnum(InterestType)
  @IsNotEmpty()
  interestType!: InterestType;

  @IsNumber()
  @IsOptional()
  graceDays?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateLateFeeConfigDto {
  @IsNumber()
  @IsOptional()
  interestRate?: number;

  @IsEnum(InterestType)
  @IsOptional()
  interestType?: InterestType;

  @IsNumber()
  @IsOptional()
  graceDays?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
