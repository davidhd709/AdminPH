import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  Length,
} from "class-validator";

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 100)
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  document: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
