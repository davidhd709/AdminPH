import { Component, computed, inject } from "@angular/core";
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

  /** Secciones del menú visibles según los permisos del rol actual. */
  readonly sections = computed<NavSection[]>(() => visibleNavSections(this.store.role()));
}
