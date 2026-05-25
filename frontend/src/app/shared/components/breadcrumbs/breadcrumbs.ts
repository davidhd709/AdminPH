import { Component, computed, input } from "@angular/core";
import { RouterLink } from "@angular/router";

export interface Breadcrumb {
  label: string;
  /** Ruta a navegar. El último item (actual) normalmente la omite. */
  route?: string;
}

interface ResolvedCrumb {
  label: string;
  /** Ruta navegable, o null si es el item actual (no enlazable). */
  link: string | null;
  current: boolean;
}

/**
 * Migas de pan. Antepone siempre "Inicio" (dashboard) y marca el último item
 * como actual (no enlazable). La resolución es un computed puro para poder
 * testearla sin tocar el DOM.
 */
@Component({
  selector: "app-breadcrumbs",
  imports: [RouterLink],
  templateUrl: "./breadcrumbs.html",
})
export class Breadcrumbs {
  readonly items = input.required<Breadcrumb[]>();

  readonly resolved = computed<ResolvedCrumb[]>(() => {
    const items = this.items();
    const lastIndex = items.length - 1;
    return items.map((item, i) => {
      const current = i === lastIndex;
      return {
        label: item.label,
        link: !current && item.route ? item.route : null,
        current,
      };
    });
  });
}
