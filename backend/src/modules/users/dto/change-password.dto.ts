import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import { IsStrongPassword } from "../../../core/validators/is-strong-password.validator";

export class ChangePasswordDto {
  @ApiProperty({ description: "Contraseña actual" })
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @ApiProperty({
    description: "Nueva contraseña fuerte (mayúscula, minúscula, número y símbolo)",
    example: "N3w!Str0ngPass",
  })
  @IsStrongPassword()
  newPassword!: string;
}
