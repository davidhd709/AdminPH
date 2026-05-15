import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

export const PASSWORD_POLICY = {
  minLength: 10,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSymbol: true,
} as const;

@ValidatorConstraint({ name: "IsStrongPassword", async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== "string") return false;
    if (value.length < PASSWORD_POLICY.minLength) return false;
    if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(value)) return false;
    if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(value)) return false;
    if (PASSWORD_POLICY.requireDigit && !/\d/.test(value)) return false;
    if (PASSWORD_POLICY.requireSymbol && !/[^A-Za-z0-9]/.test(value)) return false;
    return true;
  }

  defaultMessage(_args: ValidationArguments): string {
    return (
      `Password must be at least ${PASSWORD_POLICY.minLength} characters long ` +
      `and include uppercase, lowercase, digit and symbol.`
    );
  }
}

/**
 * Decorador para campos `password` que deben cumplir la política de seguridad.
 * Política: ≥10 chars, ≥1 mayúscula, ≥1 minúscula, ≥1 dígito, ≥1 símbolo.
 */
export function IsStrongPassword(options?: ValidationOptions): PropertyDecorator {
  return (object, propertyName) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options,
      validator: IsStrongPasswordConstraint,
    });
  };
}
