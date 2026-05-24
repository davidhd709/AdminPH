import { Component, inject, signal } from "@angular/core";
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { MessageModule } from "primeng/message";
import { PasswordModule } from "primeng/password";
import { AuthService } from "../../../../core/auth/auth.service";

/** Valida que newPassword y confirmPassword coincidan (a nivel de grupo). */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get("newPassword")?.value;
  const confirmPassword = group.get("confirmPassword")?.value;
  return newPassword === confirmPassword ? null : { passwordsMismatch: true };
}

@Component({
  selector: "app-reset-password",
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, PasswordModule, MessageModule],
  templateUrl: "./reset-password.html",
})
export class ResetPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly token = this.route.snapshot.queryParamMap.get("token");

  readonly submitting = signal(false);
  readonly done = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      newPassword: ["", [Validators.required, Validators.minLength(10)]],
      confirmPassword: ["", [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  submit(): void {
    if (!this.token || this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMsg.set(null);

    this.auth
      .resetPassword({ token: this.token, newPassword: this.form.getRawValue().newPassword })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.done.set(true);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMsg.set(
            err?.status === 401
              ? "El enlace es inválido o expiró. Solicita uno nuevo."
              : "No se pudo restablecer la contraseña. Intenta de nuevo.",
          );
        },
      });
  }
}
