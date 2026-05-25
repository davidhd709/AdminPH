import { Component, computed, inject, output } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { AuthStore } from "../../core/auth/auth.store";
import { NavSection, visibleNavSections } from "../navigation";

@Component({
  selector: "app-sidebar",
  imports: [RouterLink, RouterLinkActive],
  templateUrl: "./sidebar.html",
})
export class Sidebar {
  private readonly store = inject(AuthStore);

  /** Se emite al navegar a un item (para cerrar el drawer en móvil). */
  readonly navigate = output<void>();

  /** Secciones del menú visibles según los permisos del rol actual. */
  readonly sections = computed<NavSection[]>(() => visibleNavSections(this.store.role()));
}
