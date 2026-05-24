import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { SelectModule } from "primeng/select";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { ConfirmationService, MessageService } from "primeng/api";

import { PageHeader } from "../../shared/components/page-header/page-header";
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { StatusBadge } from "../../shared/components/status-badge/status-badge";
import { PropertyService } from "../properties/property.service";
import { Property } from "../properties/property.models";
import { UnitService } from "../units/unit.service";
import { Unit } from "../units/unit.models";
import { UserService } from "../users/user.service";
import { AppUser } from "../users/user.models";
import { PeopleService } from "./people.service";
import { Owner, Resident } from "./people.models";

type PersonKind = "owner" | "resident";

/**
 * Gestión de Propietarios y Residentes por unidad.
 * Cascada: copropiedad → unidad → (propietarios + residentes). Cada persona
 * vincula un usuario existente (selector con búsqueda). Alta/baja, sin edición
 * (el backend no expone update para estas relaciones).
 */
@Component({
  selector: "app-people",
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    SelectModule,
    ConfirmDialogModule,
    PageHeader,
    EmptyState,
    StatusBadge,
  ],
  providers: [ConfirmationService],
  templateUrl: "./people.html",
})
export class People implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly propertyService = inject(PropertyService);
  private readonly unitService = inject(UnitService);
  private readonly userService = inject(UserService);
  private readonly service = inject(PeopleService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly properties = signal<Property[]>([]);
  readonly selectedPropertyId = signal<string | null>(null);
  readonly units = signal<Unit[]>([]);
  readonly selectedUnitId = signal<string | null>(null);

  readonly owners = signal<Owner[]>([]);
  readonly residents = signal<Resident[]>([]);
  readonly loadingOwners = signal(false);
  readonly loadingResidents = signal(false);

  /** Opciones del selector de usuario (label combinado nombre · email). */
  private readonly users = signal<AppUser[]>([]);
  readonly userOptions = computed(() =>
    this.users().map((u) => ({ label: `${u.fullName} · ${u.email}`, value: u.id })),
  );

  readonly statusOptions = [
    { label: "Activo", value: "ACTIVE" },
    { label: "Inactivo", value: "INACTIVE" },
  ];

  readonly dialogVisible = signal(false);
  readonly saving = signal(false);
  readonly dialogKind = signal<PersonKind>("owner");

  readonly form = this.fb.nonNullable.group({
    userId: ["", [Validators.required]],
    status: ["ACTIVE", [Validators.required]],
  });

  ngOnInit(): void {
    this.userService.list({ page: 1, pageSize: 100, sortBy: "fullName", sortOrder: "asc" }).subscribe({
      next: (res) => this.users.set(res.items),
    });
    this.propertyService
      .list({ page: 1, pageSize: 100, sortBy: "name", sortOrder: "asc" })
      .subscribe({
        next: (res) => {
          this.properties.set(res.items);
          const first = res.items[0];
          if (first) {
            this.selectedPropertyId.set(first.id);
            this.loadUnits(first.id);
          }
        },
      });
  }

  onPropertyChange(propertyId: string): void {
    this.selectedPropertyId.set(propertyId);
    this.selectedUnitId.set(null);
    this.owners.set([]);
    this.residents.set([]);
    this.loadUnits(propertyId);
  }

  private loadUnits(propertyId: string): void {
    this.unitService.list(propertyId, { page: 1, pageSize: 100, sortBy: "code", sortOrder: "asc" }).subscribe({
      next: (res) => {
        this.units.set(res.items);
        const first = res.items[0];
        if (first) {
          this.selectedUnitId.set(first.id);
          this.loadPeople(first.id);
        }
      },
    });
  }

  onUnitChange(unitId: string): void {
    this.selectedUnitId.set(unitId);
    this.loadPeople(unitId);
  }

  private loadPeople(unitId: string): void {
    this.loadingOwners.set(true);
    this.service.listOwners(unitId).subscribe({
      next: (res) => {
        this.owners.set(res);
        this.loadingOwners.set(false);
      },
      error: () => this.loadingOwners.set(false),
    });
    this.loadingResidents.set(true);
    this.service.listResidents(unitId).subscribe({
      next: (res) => {
        this.residents.set(res);
        this.loadingResidents.set(false);
      },
      error: () => this.loadingResidents.set(false),
    });
  }

  openAdd(kind: PersonKind): void {
    this.dialogKind.set(kind);
    this.form.reset({ userId: "", status: "ACTIVE" });
    this.dialogVisible.set(true);
  }

  save(): void {
    const unitId = this.selectedUnitId();
    if (this.form.invalid || this.saving() || !unitId) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const payload = { unitId, userId: v.userId, status: v.status };
    const kind = this.dialogKind();

    const request$ =
      kind === "owner" ? this.service.createOwner(payload) : this.service.createResident(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.messages.add({
          severity: "success",
          summary: kind === "owner" ? "Propietario vinculado" : "Residente vinculado",
        });
        this.loadPeople(unitId);
      },
      error: () => this.saving.set(false),
    });
  }

  confirmRemove(kind: PersonKind, person: Owner | Resident): void {
    const unitId = this.selectedUnitId();
    const name = person.user?.fullName ?? "esta persona";
    this.confirm.confirm({
      header: kind === "owner" ? "Quitar propietario" : "Quitar residente",
      message: `¿Seguro que deseas quitar a ${name} de esta unidad?`,
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Quitar",
      rejectLabel: "Cancelar",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => {
        const request$ =
          kind === "owner"
            ? this.service.removeOwner(person.id)
            : this.service.removeResident(person.id);
        request$.subscribe({
          next: () => {
            this.messages.add({ severity: "success", summary: "Persona desvinculada" });
            if (unitId) this.loadPeople(unitId);
          },
        });
      },
    });
  }
}
