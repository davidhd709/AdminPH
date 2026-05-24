import { Component, computed, inject, signal } from "@angular/core";
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from "ng-apexcharts";
import { AuthStore } from "../../core/auth/auth.store";
import { PageHeader } from "../../shared/components/page-header/page-header";

interface StatCard {
  label: string;
  icon: string;
  value: string;
}

interface AreaChartOptions {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  fill: ApexFill;
  grid: ApexGrid;
  tooltip: ApexTooltip;
  colors: string[];
}

@Component({
  selector: "app-dashboard",
  imports: [NgApexchartsModule, PageHeader],
  templateUrl: "./dashboard.html",
})
export class Dashboard {
  private readonly store = inject(AuthStore);

  readonly userName = computed(() => this.store.user()?.fullName ?? "");

  readonly stats = signal<StatCard[]>([
    { label: "Cartera pendiente", icon: "pi pi-wallet", value: "—" },
    { label: "Pagos del mes", icon: "pi pi-credit-card", value: "—" },
    { label: "PQR abiertas", icon: "pi pi-comments", value: "—" },
    { label: "Reservas próximas", icon: "pi pi-calendar", value: "—" },
  ]);

  // Datos MOCK de recaudo por mes (se conectarán en la Fase 2).
  readonly chart = signal<AreaChartOptions>({
    series: [
      {
        name: "Recaudo",
        data: [42, 55, 48, 63, 58, 71],
      },
    ],
    chart: {
      type: "area",
      height: 320,
      toolbar: { show: false },
      fontFamily: "inherit",
    },
    colors: ["#4f46e5"],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] },
    },
    grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
    xaxis: {
      categories: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { formatter: (value: number) => `$${value}M` },
    },
    tooltip: {
      y: { formatter: (value: number) => `$${value} millones` },
    },
  });
}
