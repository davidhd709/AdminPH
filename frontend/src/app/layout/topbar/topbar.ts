import { Component, computed, inject } from "@angular/core";
import { Router } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { MenuModule } from "primeng/menu";
import { MenuItem } from "primeng/api";
import { AuthStore } from "../../core/auth/auth.store";
import { AuthService } from "../../core/auth/auth.service";

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Super Admin",
  COMPANY_ADMIN: "Admin Empresa",
  PROPERTY_ADMIN: "Admin Copropiedad",
  ACCOUNTANT: "Contador",
  SECURITY: "Portería",
  OWNER: "Propietario",
  RESIDENT: "Residente",
};

@Component({
  selector: "app-topbar",
  imports: [ButtonModule, MenuModule],
  templateUrl: "./topbar.html",
})
export class Topbar {
  private readonly store = inject(AuthStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.store.user;
  readonly roleLabel = computed(() => {
    const role = this.store.role();
    return role ? (ROLE_LABELS[role] ?? role) : "";
  });
  readonly initials = computed(() => {
    const name = this.store.user()?.fullName ?? "";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
  });

  readonly menuItems: MenuItem[] = [
    { label: "Mi perfil", icon: "pi pi-user", command: () => void this.router.navigate(["/app/profile"]) },
    { separator: true },
    { label: "Cerrar sesión", icon: "pi pi-sign-out", command: () => this.logout() },
  ];

  logout(): void {
    this.auth.logout().subscribe({
      complete: () => void this.router.navigate(["/login"]),
    });
  }
}
