import { DatePipe } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { TextareaModule } from "primeng/textarea";
import { SelectModule } from "primeng/select";
import { DatePickerModule } from "primeng/datepicker";
import { MessageService } from "primeng/api";

import { PageHeader } from "../../shared/components/page-header/page-header";
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { StatusBadge } from "../../shared/components/status-badge/status-badge";
import { UnitService } from "../units/unit.service";
import { MyUnit } from "../units/unit.models";
import { ReservationService } from "../reservations/reservation.service";
import { CommonArea, Reservation } from "../reservations/reservation.models";

/**
 * "Reservar" (propietario/residente): reserva zonas comunes de su copropiedad y
 * ve/cancela solo sus reservas (el backend scopea por requestedById). La
 * copropiedad se deriva de su unidad (/units/mine). No revisa (aprobar/rechazar
 * es del staff).
 */
@Component({
  selector: "app-my-reservations",
  imports: [
    DatePipe,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
    PageHeader,
    EmptyState,
    StatusBadge,
  ],
  templateUrl: "./my-reservations.html",
})
export class MyReservationsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ReservationService);
  private readonly unitService = inject(UnitService);
  private readonly messages = inject(MessageService);

  readonly myUnits = signal<MyUnit[]>([]);
  private readonly propertyId = signal<string | null>(null);
  readonly areas = signal<CommonArea[]>([]);
  private readonly areaById = computed(() => new Map(this.areas().map((a) => [a.id, a.name])));

  readonly reservations = signal<Reservation[]>([]);
  readonly loading = signal(false);
  readonly actingId = signal<string | null>(null);

  readonly createVisible = signal(false);
  readonly saving = signal(false);
  readonly form = this.fb.nonNullable.group({
    commonAreaId: ["", [Validators.required]],
    startTime: [new Date(), [Validators.required]],
    endTime: [new Date(), [Validators.required]],
    unitId: this.fb.control<string | null>(null),
    notes: [""],
  });

  ngOnInit(): void {
    this.unitService.mine().subscribe({
      next: (units) => {
        this.myUnits.set(units);
        const pid = units[0]?.propertyId ?? null;
        this.propertyId.set(pid);
        if (pid) {
          this.service
            .listAreas(pid, { page: 1, pageSize: 100, sortBy: "name", sortOrder: "asc" })
            .subscribe({ next: (res) => this.areas.set(res.items) });
        }
      },
    });
    this.loadReservations();
  }

  private loadReservations(): void {
    this.loading.set(true);
    this.service
      .listReservations({ page: 1, pageSize: 100, sortBy: "startTime", sortOrder: "desc" })
      .subscribe({
        next: (res) => {
          this.reservations.set(res.items);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  areaName(id: string): string {
    return this.areaById().get(id) ?? "—";
  }

  openCreate(): void {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
    const end = new Date(start);
    end.setHours(end.getHours() + 2);
    this.form.reset({
      commonAreaId: "",
      startTime: start,
      endTime: end,
      unitId: this.myUnits()[0]?.id ?? null,
      notes: "",
    });
    this.createVisible.set(true);
  }

  save(): void {
    const v = this.form.getRawValue();
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    if (v.startTime >= v.endTime) {
      this.messages.add({ severity: "warn", summary: "El inicio debe ser anterior al fin" });
      return;
    }
    this.saving.set(true);
    this.service
      .createReservation({
        commonAreaId: v.commonAreaId,
        startTime: v.startTime.toISOString(),
        endTime: v.endTime.toISOString(),
        unitId: v.unitId ?? undefined,
        notes: v.notes.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.createVisible.set(false);
          this.messages.add({
            severity: "success",
            summary: "Reserva enviada",
            detail: "Queda pendiente de aprobación.",
          });
          this.loadReservations();
        },
        error: () => this.saving.set(false),
      });
  }

  cancel(r: Reservation): void {
    if (this.actingId()) return;
    this.actingId.set(r.id);
    this.service.cancel(r.id).subscribe({
      next: () => {
        this.actingId.set(null);
        this.messages.add({ severity: "success", summary: "Reserva cancelada" });
        this.loadReservations();
      },
      error: () => this.actingId.set(null),
    });
  }
}
