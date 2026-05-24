import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { IsStrongPassword } from "../../../core/validators/is-strong-password.validator";

export class CreateUserDto {
  @ApiProperty({ description: "Email del usuario", example: "usuario@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: "Contraseña fuerte (mayúscula, minúscula, número y símbolo)",
    example: "S3cr3t!Pass",
  })
  @IsStrongPassword()
  password!: string;

  @ApiProperty({ description: "Nombre completo del usuario", example: "Juan Pérez" })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ description: "Documento de identidad", example: "1020304050" })
  @IsString()
  @IsNotEmpty()
  document!: string;

  @ApiPropertyOptional({ description: "Teléfono del usuario", example: "3001234567" })
  @IsString()
  @IsOptional()
  phone?: string;
}
