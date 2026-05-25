import { Component, computed, input } from "@angular/core";

export type KpiTone = "blue" | "green" | "amber" | "red" | "sky" | "slate";

/** Clases completas (literales) para que Tailwind las detecte al escanear. */
const TONE_CLASSES: Record<KpiTone, string> = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  sky: "bg-sky-50 text-sky-600",
  slate: "bg-slate-100 text-slate-600",
};

/**
 * Tarjeta de KPI: etiqueta, valor grande e icono con tono de color. El valor
 * puede ser `null` mientras carga (muestra un placeholder). Reemplaza el
 * patrón inline de stat-cards del dashboard.
 */
@Component({
  selector: "app-kpi-card",
  templateUrl: "./kpi-card.html",
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<number | string | null>();
  readonly icon = input<string>("pi pi-chart-bar");
  readonly tone = input<KpiTone>("blue");

  /** Valor a mostrar; placeholder mientras el dato llega (null). */
  readonly displayValue = computed<string>(() => {
    const v = this.value();
    return v === null ? "…" : `${v}`;
  });

  readonly toneClasses = computed<string>(() => TONE_CLASSES[this.tone()]);
}
