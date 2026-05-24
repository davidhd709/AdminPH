import { ValidationArguments } from "class-validator";
import { IsStrongPasswordConstraint } from "./is-strong-password.validator";

describe("IsStrongPasswordConstraint", () => {
  let constraint: IsStrongPasswordConstraint;

  beforeEach(() => {
    constraint = new IsStrongPasswordConstraint();
  });

  describe("validate", () => {
    it("accepts a strong password", () => {
      expect(constraint.validate("StrongPass1!")).toBe(true);
    });

    it("rejects a password that is too short", () => {
      expect(constraint.validate("Sp1!")).toBe(false);
    });

    it("rejects a password without an uppercase letter", () => {
      expect(constraint.validate("strongpass1!")).toBe(false);
    });

    it("rejects a password without a lowercase letter", () => {
      expect(constraint.validate("STRONGPASS1!")).toBe(false);
    });

    it("rejects a password without a digit", () => {
      expect(constraint.validate("StrongPass!!")).toBe(false);
    });

    it("rejects a password without a symbol", () => {
      expect(constraint.validate("StrongPass11")).toBe(false);
    });

    it("rejects a non-string number value", () => {
      expect(constraint.validate(12345678901 as unknown as string)).toBe(false);
    });

    it("rejects undefined", () => {
      expect(constraint.validate(undefined as unknown as string)).toBe(false);
    });
  });

  describe("defaultMessage", () => {
    it("returns a non-empty string", () => {
      const message = constraint.defaultMessage({} as ValidationArguments);
      expect(typeof message).toBe("string");
      expect(message.length).toBeGreaterThan(0);
    });
  });
});
