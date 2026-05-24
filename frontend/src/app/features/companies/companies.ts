import { Component } from "@angular/core";
import { PageHeader } from "../../shared/components/page-header/page-header";
import { EmptyState } from "../../shared/components/empty-state/empty-state";

/**
 * Módulo de referencia (placeholder). Demuestra el patrón de una ruta de
 * módulo protegida por rol: en app.routes.ts se monta bajo /app con
 * `roleGuard("SUPERADMIN")`. El CRUD real llega en una fase posterior.
 */
@Component({
  selector: "app-companies",
  imports: [PageHeader, EmptyState],
  templateUrl: "./companies.html",
})
export class Companies {}
