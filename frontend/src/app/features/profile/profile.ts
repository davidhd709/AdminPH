import { Component, OnInit, inject, signal } from "@angular/core";
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from "@angular/forms";
import { Router } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { InputTextModule } from "primeng/inputtext";
import { PasswordModule } from "primeng/password";
import { MessageService } from "primeng/api";

import { PageHeader } from "../../shared/components/page-header/page-header";
import { SectionCard } from "../../shared/components/section-card/section-card";
import { AuthService } from "../../core/auth/auth.service";
import { AppUser } from "../users/user.models";
import { ProfileService } from "./profile.service";

/** Política de contraseña del backend: ≥10, mayúscula, minúscula, dígito y símbolo. */
function strongPassword(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value ?? "";
  const ok =
    v.length >= 10 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v);
  return ok ? null : { weakPassword: true };
}

/**
 * Mi perfil: editar nombre/teléfono (PATCH /users/me) y cambiar contraseña
 * (POST /users/me/change-password). Tras cambiar la contraseña el backend
 * revoca las sesiones, así que se cierra sesión y se redirige al login.
 */
@Component({
  selector: "app-profile",
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, PasswordModule, PageHeader, SectionCard],
  templateUrl: "./profile.html",
})
export class Profile implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);

  readonly me = signal<AppUser | null>(null);
  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);

  readonly profileForm = this.fb.nonNullable.group({
    fullName: ["", [Validators.required, Validators.maxLength(150)]],
    phone: [""],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    oldPassword: ["", [Validators.required]],
    newPassword: ["", [Validators.required, strongPassword]],
  });

  ngOnInit(): void {
    this.service.getMe().subscribe({
      next: (u) => {
        this.me.set(u);
        this.profileForm.reset({ fullName: u.fullName, phone: u.phone ?? "" });
      },
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.savingProfile()) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.savingProfile.set(true);
    const v = this.profileForm.getRawValue();
    this.service.updateMe({ fullName: v.fullName.trim(), phone: v.phone.trim() || undefined }).subscribe({
      next: (u) => {
        this.me.set(u);
        this.savingProfile.set(false);
        this.messages.add({ severity: "success", summary: "Perfil actualizado" });
      },
      error: () => this.savingProfile.set(false),
    });
  }

  savePassword(): void {
    if (this.passwordForm.invalid || this.savingPassword()) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.savingPassword.set(true);
    const v = this.passwordForm.getRawValue();
    this.service.changePassword({ oldPassword: v.oldPassword, newPassword: v.newPassword }).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.messages.add({
          severity: "success",
          summary: "Contraseña cambiada",
          detail: "Vuelve a iniciar sesión con tu nueva contraseña.",
        });
        this.auth.clearSession();
        void this.router.navigate(["/login"]);
      },
      error: () => this.savingPassword.set(false),
    });
  }
}
