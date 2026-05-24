import { Component, computed, input } from "@angular/core";
import { TagModule } from "primeng/tag";

type TagSeverity = "success" | "info" | "warn" | "danger" | "secondary" | "contrast";

const STATUS_SEVERITY: Record<string, TagSeverity> = {
  ACTIVE: "success",
  APPROVED: "success",
  PAID: "success",
  OCCUPIED: "success",
  RESOLVED: "success",
  PENDING: "warn",
  PENDING_REVIEW: "warn",
  SUSPENDED: "warn",
  MAINTENANCE: "warn",
  IN_PROGRESS: "warn",
  PARTIAL: "info",
  RENTED: "info",
  OPEN: "info",
  VACANT: "secondary",
  INACTIVE: "secondary",
  CLOSED: "secondary",
  OVERDUE: "danger",
  REJECTED: "danger",
  CANCELLED: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activo",
  APPROVED: "Aprobado",
  PAID: "Pagado",
  OCCUPIED: "Ocupada",
  RESOLVED: "Resuelta",
  PENDING: "Pendiente",
  PENDING_REVIEW: "En revisión",
  SUSPENDED: "Suspendido",
  MAINTENANCE: "Mantenimiento",
  IN_PROGRESS: "En progreso",
  PARTIAL: "Parcial",
  RENTED: "Arrendada",
  VACANT: "Vacante",
  OPEN: "Abierta",
  INACTIVE: "Inactivo",
  CLOSED: "Cerrada",
  OVERDUE: "En mora",
  REJECTED: "Rechazado",
  CANCELLED: "Cancelado",
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
