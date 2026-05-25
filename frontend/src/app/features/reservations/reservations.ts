import { DatePipe } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { TextareaModule } from "primeng/textarea";
import { SelectModule } from "primeng/select";
import { DatePickerModule } from "primeng/datepicker";
import { MessageService } from "primeng/api";

import { PageHeader } from "../../shared/components/page-header/page-header";
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { StatusBadge } from "../../shared/components/status-badge/status-badge";
import { SectionCard } from "../../shared/components/section-card/section-card";
import { ActionToolbar } from "../../shared/components/action-toolbar/action-toolbar";
import { PropertyService } from "../properties/property.service";
import { Property } from "../properties/property.models";
import { UnitService } from "../units/unit.service";
import { Unit } from "../units/unit.models";
import { ReservationService } from "./reservation.service";
import {
  RESERVATION_STATUS_OPTIONS,
  CommonArea,
  Reservation,
  ReservationStatus,
} from "./reservation.models";

/**
 * Reservas de zonas comunes (Operación). Por copropiedad: gestión de zonas
 * comunes (crear/listar) y reservas (crear con validación de solapamiento en el
 * backend, aprobar/rechazar y cancelar). Acceso staff.
 */
@Component({
  selector: "app-reservations",
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
    PageHeader,
    EmptyState,
    StatusBadge,
    SectionCard,
    ActionToolbar,
  ],
  templateUrl: "./reservations.html",
})
export class Reservations implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ReservationService);
  private readonly propertyService = inject(PropertyService);
  private readonly unitService = inject(UnitService);
  private readonly messages = inject(MessageService);

  readonly statusOptions = RESERVATION_STATUS_OPTIONS;

  readonly properties = signal<Property[]>([]);
  readonly selectedPropertyId = signal<string | null>(null);
  readonly units = signal<Unit[]>([]);

  readonly areas = signal<CommonArea[]>([]);
  private readonly areaById = computed(() => new Map(this.areas().map((a) => [a.id, a.name])));

  readonly reservations = signal<Reservation[]>([]);
  readonly loadingReservations = signal(false);
  readonly filterStatus = signal<ReservationStatus | null>(null);
  readonly filterAreaId = signal<string | null>(null);
  /** Id de la reserva sobre la que se está actuando (evita doble click). */
  readonly actingId = signal<string | null>(null);

  // Diálogos
  readonly areaVisible = signal(false);
  readonly savingArea = signal(false);
  readonly reservationVisible = signal(false);
  readonly savingReservation = signal(false);

  readonly areaForm = this.fb.nonNullable.group({
    name: ["", [Validators.required, Validators.maxLength(120)]],
    description: [""],
  });

  readonly reservationForm = this.fb.nonNullable.group({
    commonAreaId: ["", [Validators.required]],
    startTime: [new Date(), [Validators.required]],
    endTime: [new Date(), [Validators.required]],
    unitId: this.fb.control<string | null>(null),
    notes: [""],
  });

  ngOnInit(): void {
    this.propertyService
      .list({ page: 1, pageSize: 100, sortBy: "name", sortOrder: "asc" })
      .subscribe({
        next: (res) => {
          this.properties.set(res.items);
          const first = res.items[0];
          if (first) {
            this.selectedPropertyId.set(first.id);
            this.loadAll(first.id);
          }
        },
      });
  }

  onPropertyChange(propertyId: string): void {
    this.selectedPropertyId.set(propertyId);
    this.filterAreaId.set(null);
    this.loadAll(propertyId);
  }

  private loadAll(propertyId: string): void {
    this.service.listAreas(propertyId, { page: 1, pageSize: 100, sortBy: "name", sortOrder: "asc" }).subscribe({
      next: (res) => this.areas.set(res.items),
    });
    this.unitService.list(propertyId, { page: 1, pageSize: 100, sortBy: "code", sortOrder: "asc" }).subscribe({
      next: (res) => this.units.set(res.items),
    });
    this.loadReservations();
  }

  loadReservations(): void {
    const propertyId = this.selectedPropertyId();
    if (!propertyId) return;
    this.loadingReservations.set(true);
    this.service
      .listReservations({
        propertyId,
        commonAreaId: this.filterAreaId() ?? undefined,
        status: this.filterStatus() ?? undefined,
        page: 1,
        pageSize: 100,
        sortBy: "startTime",
        sortOrder: "desc",
      })
      .subscribe({
        next: (res) => {
          this.reservations.set(res.items);
          this.loadingReservations.set(false);
        },
        error: () => this.loadingReservations.set(false),
      });
  }

  areaName(id: string): string {
    return this.areaById().get(id) ?? "—";
  }

  // ===== Zona común =====
  openArea(): void {
    this.areaForm.reset({ name: "", description: "" });
    this.areaVisible.set(true);
  }

  saveArea(): void {
    const propertyId = this.selectedPropertyId();
    if (this.areaForm.invalid || this.savingArea() || !propertyId) {
      this.areaForm.markAllAsTouched();
      return;
    }
    this.savingArea.set(true);
    const v = this.areaForm.getRawValue();
    this.service
      .createArea({ propertyId, name: v.name.trim(), description: v.description.trim() || undefined })
      .subscribe({
        next: () => {
          this.savingArea.set(false);
          this.areaVisible.set(false);
          this.messages.add({ severity: "success", summary: "Zona común creada", detail: v.name });
          const pid = this.selectedPropertyId();
          if (pid) {
            this.service.listAreas(pid, { page: 1, pageSize: 100, sortBy: "name", sortOrder: "asc" }).subscribe({
              next: (res) => this.areas.set(res.items),
            });
          }
        },
        error: () => this.savingArea.set(false),
      });
  }

  // ===== Reserva =====
  openReservation(): void {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
    const end = new Date(start);
    end.setHours(end.getHours() + 2);
    this.reservationForm.reset({
      commonAreaId: "",
      startTime: start,
      endTime: end,
      unitId: null,
      notes: "",
    });
    this.reservationVisible.set(true);
  }

  saveReservation(): void {
    const v = this.reservationForm.getRawValue();
    if (this.reservationForm.invalid || this.savingReservation()) {
      this.reservationForm.markAllAsTouched();
      return;
    }
    if (v.startTime >= v.endTime) {
      this.messages.add({ severity: "warn", summary: "El inicio debe ser anterior al fin" });
      return;
    }
    this.savingReservation.set(true);
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
          this.savingReservation.set(false);
          this.reservationVisible.set(false);
          this.messages.add({ severity: "success", summary: "Reserva creada", detail: "Queda pendiente de aprobación." });
          this.loadReservations();
        },
        error: () => this.savingReservation.set(false),
      });
  }

  approve(r: Reservation): void {
    this.act(r.id, this.service.review(r.id, "APPROVED"), "Reserva aprobada");
  }

  reject(r: Reservation): void {
    this.act(r.id, this.service.review(r.id, "REJECTED"), "Reserva rechazada");
  }

  cancel(r: Reservation): void {
    this.act(r.id, this.service.cancel(r.id), "Reserva cancelada");
  }

  private act(id: string, request$: ReturnType<ReservationService["cancel"]>, summary: string): void {
    if (this.actingId()) return;
    this.actingId.set(id);
    request$.subscribe({
      next: () => {
        this.actingId.set(null);
        this.messages.add({ severity: "success", summary });
        this.loadReservations();
      },
      error: () => this.actingId.set(null),
    });
  }
}
