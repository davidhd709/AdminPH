import { Component, OnInit, computed, inject, signal } from "@angular/core";
import {
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexPlotOptions,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from "ng-apexcharts";
import { AuthStore } from "../../core/auth/auth.store";
import { roleHasPermission } from "../../core/auth/permissions";
import { PageHeader } from "../../shared/components/page-header/page-header";
import { PropertyService } from "../properties/property.service";
import { PqrService } from "../pqr/pqr.service";
import { PaymentService } from "../payments/payment.service";
import { ReservationService } from "../reservations/reservation.service";

interface StatCard {
  label: string;
  icon: string;
  value: number | null;
}

interface BarChartOptions {
  series: { name: string; data: number[] }[];
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  fill: ApexFill;
  colors: string[];
}

/**
 * Dashboard con datos reales. Los KPI se obtienen con `pageSize=1` leyendo
 * `meta.total`, y se piden solo los que el rol puede consultar (evita 403). El
 * gráfico muestra las PQR por estado cuando el rol gestiona PQR.
 */
@Component({
  selector: "app-dashboard",
  imports: [NgApexchartsModule, PageHeader],
  templateUrl: "./dashboard.html",
})
export class Dashboard implements OnInit {
  private readonly store = inject(AuthStore);
  private readonly propertyService = inject(PropertyService);
  private readonly pqrService = inject(PqrService);
  private readonly paymentService = inject(PaymentService);
  private readonly reservationService = inject(ReservationService);

  readonly userName = computed(() => this.store.user()?.fullName ?? "");

  private readonly canProperties = computed(() =>
    this.store.hasRole("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN"),
  );
  private readonly can = (perm: Parameters<typeof roleHasPermission>[1]): boolean => {
    const role = this.store.role();
    return role ? roleHasPermission(role, perm) : false;
  };

  // KPIs (null = cargando / no disponible)
  private readonly properties = signal<number | null>(null);
  private readonly openPqr = signal<number | null>(null);
  private readonly pendingPayments = signal<number | null>(null);
  private readonly pendingReservations = signal<number | null>(null);

  readonly stats = computed<StatCard[]>(() => {
    const cards: StatCard[] = [];
    if (this.canProperties()) {
      cards.push({ label: "Copropiedades", icon: "pi pi-building-columns", value: this.properties() });
    }
    if (this.can("pqr.manage")) {
      cards.push({ label: "PQR abiertas", icon: "pi pi-comments", value: this.openPqr() });
    }
    if (this.can("payments.manage")) {
      cards.push({ label: "Pagos en revisión", icon: "pi pi-credit-card", value: this.pendingPayments() });
    }
    if (this.can("reservations.manage")) {
      cards.push({ label: "Reservas pendientes", icon: "pi pi-calendar", value: this.pendingReservations() });
    }
    return cards;
  });

  readonly showPqrChart = computed(() => this.can("pqr.manage"));
  readonly chart = signal<BarChartOptions | null>(null);

  ngOnInit(): void {
    const q = (extra: Record<string, string> = {}) => ({
      page: 1,
      pageSize: 1,
      sortOrder: "desc" as const,
      ...extra,
    });

    if (this.canProperties()) {
      this.propertyService.list(q()).subscribe({ next: (r) => this.properties.set(r.meta.total) });
    }
    if (this.can("pqr.manage")) {
      this.pqrService.list({ ...q(), status: "OPEN" }).subscribe({
        next: (r) => this.openPqr.set(r.meta.total),
      });
      this.loadPqrChart();
    }
    if (this.can("payments.manage")) {
      this.paymentService.list({ ...q(), status: "PENDING_REVIEW" }).subscribe({
        next: (r) => this.pendingPayments.set(r.meta.total),
      });
    }
    if (this.can("reservations.manage")) {
      this.reservationService.listReservations({ ...q(), status: "PENDING" }).subscribe({
        next: (r) => this.pendingReservations.set(r.meta.total),
      });
    }
  }

  /** Cuenta las PQR por estado (4 llamadas pageSize=1) y arma el gráfico de barras. */
  private loadPqrChart(): void {
    const statuses = [
      { key: "OPEN", label: "Abiertas" },
      { key: "IN_PROGRESS", label: "En progreso" },
      { key: "RESOLVED", label: "Resueltas" },
      { key: "CLOSED", label: "Cerradas" },
    ] as const;
    const counts: number[] = new Array(statuses.length).fill(0);
    let pending = statuses.length;

    statuses.forEach((s, i) => {
      this.pqrService.list({ page: 1, pageSize: 1, sortOrder: "desc", status: s.key }).subscribe({
        next: (r) => {
          counts[i] = r.meta.total;
          if (--pending === 0) this.buildChart(statuses.map((x) => x.label), counts);
        },
        error: () => {
          if (--pending === 0) this.buildChart(statuses.map((x) => x.label), counts);
        },
      });
    });
  }

  private buildChart(categories: string[], data: number[]): void {
    this.chart.set({
      series: [{ name: "PQR", data }],
      chart: { type: "bar", height: 300, toolbar: { show: false }, fontFamily: "inherit" },
      colors: ["#4f46e5"],
      plotOptions: { bar: { borderRadius: 6, columnWidth: "45%", distributed: false } },
      dataLabels: { enabled: true },
      fill: { opacity: 1 },
      xaxis: { categories, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { formatter: (v: number) => `${Math.round(v)}` } },
    });
  }
}
