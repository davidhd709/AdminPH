import { Component, computed, inject } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { AuthStore } from "../../core/auth/auth.store";
import { roleHasPermission } from "../../core/auth/permissions";
import { NAVIGATION, NavSection } from "../navigation";

@Component({
  selector: "app-sidebar",
  imports: [RouterLink, RouterLinkActive],
  templateUrl: "./sidebar.html",
})
export class Sidebar {
  private readonly store = inject(AuthStore);

  /** Secciones del menú visibles según los permisos del rol actual. */
  readonly sections = computed<NavSection[]>(() => {
    const role = this.store.role();
    if (!role) return [];
    return NAVIGATION.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.permission || roleHasPermission(role, item.permission),
      ),
    })).filter((section) => section.items.length > 0);
  });
}
