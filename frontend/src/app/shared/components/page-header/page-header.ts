import { Component, input } from "@angular/core";
import { Breadcrumb, Breadcrumbs } from "../breadcrumbs/breadcrumbs";

/**
 * Encabezado de página: migas opcionales, título, subtítulo y un slot de
 * acciones a la derecha (ng-content).
 */
@Component({
  selector: "app-page-header",
  imports: [Breadcrumbs],
  templateUrl: "./page-header.html",
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  /** Migas de pan opcionales; si se omiten, no se renderizan. */
  readonly breadcrumbs = input<Breadcrumb[]>();
}
