import { Component, input } from "@angular/core";

/**
 * Tarjeta de sección reutilizable: contenedor blanco con borde/sombra suave y
 * un header opcional (título + subtítulo + acciones). Reemplaza el patrón
 * repetido `rounded-xl border bg-white shadow-sm`.
 *
 * Uso:
 *   <app-section-card title="Pagos" subtitle="…">
 *     <p-button card-actions label="Nuevo" />
 *     ...contenido...
 *   </app-section-card>
 */
@Component({
  selector: "app-section-card",
  templateUrl: "./section-card.html",
})
export class SectionCard {
  readonly title = input<string>();
  readonly subtitle = input<string>();
  /** Aplica padding al cuerpo. Desactivar cuando dentro va una tabla a sangre. */
  readonly bodyPadding = input<boolean>(true);
}
