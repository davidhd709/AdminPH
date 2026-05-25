import { DatePipe } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { TextareaModule } from "primeng/textarea";
import { SelectModule } from "primeng/select";
import { MessageService } from "primeng/api";

import { PageHeader } from "../../shared/components/page-header/page-header";
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { SectionCard } from "../../shared/components/section-card/section-card";
import { ActionToolbar } from "../../shared/components/action-toolbar/action-toolbar";
import { PropertyService } from "../properties/property.service";
import { Property } from "../properties/property.models";
import { UnitService } from "../units/unit.service";
import { Unit } from "../units/unit.models";
import { VisitorService } from "./visitor.service";
import { Visitor, VISITOR_TYPE_OPTIONS, VisitorType, visitorTypeLabel } from "./visitor.models";
import { RegistryService } from "./registry.service";
import {
  Pet,
  VEHICLE_TYPE_OPTIONS,
  Vehicle,
  VehicleType,
  vehicleTypeLabel,
} from "./registry.models";

/**
 * Portería (Operación). Por copropiedad: bitácora de visitantes (ingreso/salida),
 * y registro de vehículos y mascotas por unidad. Acceso staff
 * (SUPERADMIN/COMPANY_ADMIN/PROPERTY_ADMIN; SECURITY diferido — requiere
 * GET /properties para ese rol).
 */
@Component({
  selector: "app-security",
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
    PageHeader,
    EmptyState,
    SectionCard,
    ActionToolbar,
  ],
  templateUrl: "./security.html",
})
export class Security implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly propertyService = inject(PropertyService);
  private readonly unitService = inject(UnitService);
  private readonly visitorService = inject(VisitorService);
  private readonly registryService = inject(RegistryService);
  private readonly messages = inject(MessageService);

  readonly visitorTypeOptions = VISITOR_TYPE_OPTIONS;
  readonly vehicleTypeOptions = VEHICLE_TYPE_OPTIONS;
  readonly visitorTypeLabel = visitorTypeLabel;
  readonly vehicleTypeLabel = vehicleTypeLabel;

  readonly properties = signal<Property[]>([]);
  readonly selectedPropertyId = signal<string | null>(null);
  readonly units = signal<Unit[]>([]);
  private readonly unitById = computed(() => new Map(this.units().map((u) => [u.id, u.code])));

  readonly visitors = signal<Visitor[]>([]);
  readonly loadingVisitors = signal(false);
  readonly filterVisitorType = signal<VisitorType | null>(null);
  readonly vehicles = signal<Vehicle[]>([]);
  readonly loadingVehicles = signal(false);
  readonly pets = signal<Pet[]>([]);
  readonly loadingPets = signal(false);
  readonly actingId = signal<string | null>(null);

  // Diálogos
  readonly visitorVisible = signal(false);
  readonly savingVisitor = signal(false);
  readonly vehicleVisible = signal(false);
  readonly savingVehicle = signal(false);
  readonly petVisible = signal(false);
  readonly savingPet = signal(false);

  readonly visitorForm = this.fb.nonNullable.group({
    fullName: ["", [Validators.required, Validators.maxLength(150)]],
    document: [""],
    type: ["VISITOR" as VisitorType, [Validators.required]],
    unitId: this.fb.control<string | null>(null),
    notes: [""],
  });

  readonly vehicleForm = this.fb.nonNullable.group({
    unitId: ["", [Validators.required]],
    plate: ["", [Validators.required, Validators.maxLength(20)]],
    type: ["CAR" as VehicleType, [Validators.required]],
    brand: [""],
    color: [""],
    parkingSpot: [""],
  });

  readonly petForm = this.fb.nonNullable.group({
    unitId: ["", [Validators.required]],
    name: ["", [Validators.required, Validators.maxLength(80)]],
    species: ["", [Validators.required, Validators.maxLength(50)]],
    breed: [""],
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
    this.loadAll(propertyId);
  }

  private loadAll(propertyId: string): void {
    this.unitService.list(propertyId, { page: 1, pageSize: 100, sortBy: "code", sortOrder: "asc" }).subscribe({
      next: (res) => this.units.set(res.items),
    });
    this.loadVisitors();
    this.loadVehicles();
    this.loadPets();
  }

  unitName(id: string | null): string {
    return id ? (this.unitById().get(id) ?? "—") : "—";
  }

  // ===== Visitantes =====
  loadVisitors(): void {
    const propertyId = this.selectedPropertyId();
    if (!propertyId) return;
    this.loadingVisitors.set(true);
    this.visitorService
      .list({
        propertyId,
        type: this.filterVisitorType() ?? undefined,
        page: 1,
        pageSize: 100,
        sortBy: "entryAt",
        sortOrder: "desc",
      })
      .subscribe({
        next: (res) => {
          this.visitors.set(res.items);
          this.loadingVisitors.set(false);
        },
        error: () => this.loadingVisitors.set(false),
      });
  }

  openVisitor(): void {
    this.visitorForm.reset({ fullName: "", document: "", type: "VISITOR", unitId: null, notes: "" });
    this.visitorVisible.set(true);
  }

  saveVisitor(): void {
    const propertyId = this.selectedPropertyId();
    if (this.visitorForm.invalid || this.savingVisitor() || !propertyId) {
      this.visitorForm.markAllAsTouched();
      return;
    }
    this.savingVisitor.set(true);
    const v = this.visitorForm.getRawValue();
    this.visitorService
      .register({
        propertyId,
        fullName: v.fullName.trim(),
        document: v.document.trim() || undefined,
        type: v.type,
        unitId: v.unitId ?? undefined,
        notes: v.notes.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.savingVisitor.set(false);
          this.visitorVisible.set(false);
          this.messages.add({ severity: "success", summary: "Ingreso registrado" });
          this.loadVisitors();
        },
        error: () => this.savingVisitor.set(false),
      });
  }

  registerExit(v: Visitor): void {
    if (this.actingId()) return;
    this.actingId.set(v.id);
    this.visitorService.registerExit(v.id).subscribe({
      next: () => {
        this.actingId.set(null);
        this.messages.add({ severity: "success", summary: "Salida registrada" });
        this.loadVisitors();
      },
      error: () => this.actingId.set(null),
    });
  }

  // ===== Vehículos =====
  loadVehicles(): void {
    const propertyId = this.selectedPropertyId();
    if (!propertyId) return;
    this.loadingVehicles.set(true);
    this.registryService.listVehicles({ propertyId, page: 1, pageSize: 100, sortOrder: "desc" }).subscribe({
      next: (res) => {
        this.vehicles.set(res.items);
        this.loadingVehicles.set(false);
      },
      error: () => this.loadingVehicles.set(false),
    });
  }

  openVehicle(): void {
    this.vehicleForm.reset({ unitId: "", plate: "", type: "CAR", brand: "", color: "", parkingSpot: "" });
    this.vehicleVisible.set(true);
  }

  saveVehicle(): void {
    if (this.vehicleForm.invalid || this.savingVehicle()) {
      this.vehicleForm.markAllAsTouched();
      return;
    }
    this.savingVehicle.set(true);
    const v = this.vehicleForm.getRawValue();
    this.registryService
      .createVehicle({
        unitId: v.unitId,
        plate: v.plate.trim(),
        type: v.type,
        brand: v.brand.trim() || undefined,
        color: v.color.trim() || undefined,
        parkingSpot: v.parkingSpot.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.savingVehicle.set(false);
          this.vehicleVisible.set(false);
          this.messages.add({ severity: "success", summary: "Vehículo registrado", detail: v.plate });
          this.loadVehicles();
        },
        error: () => this.savingVehicle.set(false),
      });
  }

  removeVehicle(vehicle: Vehicle): void {
    if (this.actingId()) return;
    this.actingId.set(vehicle.id);
    this.registryService.removeVehicle(vehicle.id).subscribe({
      next: () => {
        this.actingId.set(null);
        this.messages.add({ severity: "success", summary: "Vehículo eliminado" });
        this.loadVehicles();
      },
      error: () => this.actingId.set(null),
    });
  }

  // ===== Mascotas =====
  loadPets(): void {
    const propertyId = this.selectedPropertyId();
    if (!propertyId) return;
    this.loadingPets.set(true);
    this.registryService.listPets({ propertyId, page: 1, pageSize: 100, sortOrder: "desc" }).subscribe({
      next: (res) => {
        this.pets.set(res.items);
        this.loadingPets.set(false);
      },
      error: () => this.loadingPets.set(false),
    });
  }

  openPet(): void {
    this.petForm.reset({ unitId: "", name: "", species: "", breed: "", notes: "" });
    this.petVisible.set(true);
  }

  savePet(): void {
    if (this.petForm.invalid || this.savingPet()) {
      this.petForm.markAllAsTouched();
      return;
    }
    this.savingPet.set(true);
    const v = this.petForm.getRawValue();
    this.registryService
      .createPet({
        unitId: v.unitId,
        name: v.name.trim(),
        species: v.species.trim(),
        breed: v.breed.trim() || undefined,
        notes: v.notes.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.savingPet.set(false);
          this.petVisible.set(false);
          this.messages.add({ severity: "success", summary: "Mascota registrada", detail: v.name });
          this.loadPets();
        },
        error: () => this.savingPet.set(false),
      });
  }

  removePet(pet: Pet): void {
    if (this.actingId()) return;
    this.actingId.set(pet.id);
    this.registryService.removePet(pet.id).subscribe({
      next: () => {
        this.actingId.set(null);
        this.messages.add({ severity: "success", summary: "Mascota eliminada" });
        this.loadPets();
      },
      error: () => this.actingId.set(null),
    });
  }
}
