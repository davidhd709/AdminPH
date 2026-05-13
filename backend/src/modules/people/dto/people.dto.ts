import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateOwnerDto {
  @IsString()
  @IsNotEmpty()
  unitId: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  status?: string;
}

export class CreateResidentDto {
  @IsString()
  @IsNotEmpty()
  unitId: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
