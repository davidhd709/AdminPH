import { Component, computed, input } from "@angular/core";
import { TagModule } from "primeng/tag";

type TagSeverity = "success" | "info" | "warn" | "danger" | "secondary" | "contrast";

const STATUS_SEVERITY: Record<string, TagSeverity> = {
  ACTIVE: "success",
  APPROVED: "success",
  PAID: "success",
  PENDING: "warn",
  OVERDUE: "danger",
  REJECTED: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activo",
  APPROVED: "Aprobado",
  PAID: "Pagado",
  PENDING: "Pendiente",
  OVERDUE: "En mora",
  REJECTED: "Rechazado",
};

@Component({
  selector: "app-status-badge",
  imports: [TagModule],
  templateUrl: "./status-badge.html",
})
export class StatusBadge {
  readonly status = input.required<string>();
  /** Permite forzar la severidad; si se omite se infiere del status. */
  readonly severity = input<TagSeverity>();

  readonly resolvedSeverity = computed<TagSeverity>(
    () => this.severity() ?? STATUS_SEVERITY[this.status().toUpperCase()] ?? "secondary",
  );

  readonly label = computed<string>(() => {
    const key = this.status().toUpperCase();
    return STATUS_LABEL[key] ?? this.status();
  });
}
