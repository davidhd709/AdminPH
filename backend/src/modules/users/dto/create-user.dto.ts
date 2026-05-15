import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { IsStrongPassword } from "../../../core/validators/is-strong-password.validator";

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsStrongPassword()
  password!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  document!: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
