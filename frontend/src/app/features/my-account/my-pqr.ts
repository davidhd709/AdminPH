import { DatePipe } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { TextareaModule } from "primeng/textarea";
import { SelectModule } from "primeng/select";
import { MessageService } from "primeng/api";

import { PageHeader } from "../../shared/components/page-header/page-header";
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { StatusBadge } from "../../shared/components/status-badge/status-badge";
import { SectionCard } from "../../shared/components/section-card/section-card";
import { AuthStore } from "../../core/auth/auth.store";
import { UnitService } from "../units/unit.service";
import { MyUnit } from "../units/unit.models";
import { PqrService } from "../pqr/pqr.service";
import {
  PQR_CATEGORY_OPTIONS,
  Pqr,
  PqrCategory,
  PqrDetail,
  buildRadicado,
  pqrCategoryLabel,
} from "../pqr/pqr.models";

/**
 * "Mis PQR" (propietario/residente): ve solo sus solicitudes (el backend filtra
 * por createdById), las crea desde una de sus unidades y responde en el hilo.
 * No puede cambiar el estado (eso es del staff).
 */
@Component({
  selector: "app-my-pqr",
  imports: [
    DatePipe,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    PageHeader,
    EmptyState,
    StatusBadge,
    SectionCard,
  ],
  templateUrl: "./my-pqr.html",
})
export class MyPqrPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PqrService);
  private readonly unitService = inject(UnitService);
  private readonly store = inject(AuthStore);
  private readonly messages = inject(MessageService);

  readonly categoryOptions = PQR_CATEGORY_OPTIONS;
  readonly categoryLabel = pqrCategoryLabel;
  readonly radicado = buildRadicado;
  readonly currentUserId = this.store.user()?.id ?? null;

  readonly myUnits = signal<MyUnit[]>([]);
  readonly pqrs = signal<Pqr[]>([]);
  readonly loading = signal(false);

  readonly createVisible = signal(false);
  readonly savingCreate = signal(false);
  readonly createForm = this.fb.nonNullable.group({
    unitId: ["", [Validators.required]],
    category: ["PETITION" as PqrCategory, [Validators.required]],
    subject: ["", [Validators.required, Validators.maxLength(200)]],
    description: ["", [Validators.required, Validators.maxLength(5000)]],
  });

  readonly detailVisible = signal(false);
  readonly loadingDetail = signal(false);
  readonly detail = signal<PqrDetail | null>(null);
  readonly responding = signal(false);
  readonly respondForm = this.fb.nonNullable.group({
    message: ["", [Validators.required, Validators.maxLength(5000)]],
  });

  ngOnInit(): void {
    this.unitService.mine().subscribe({ next: (u) => this.myUnits.set(u) });
    this.loadPqrs();
  }

  private loadPqrs(): void {
    this.loading.set(true);
    this.service.list({ page: 1, pageSize: 100, sortBy: "createdAt", sortOrder: "desc" }).subscribe({
      next: (res) => {
        this.pqrs.set(res.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    const units = this.myUnits();
    this.createForm.reset({
      unitId: units.length === 1 ? units[0].id : "",
      category: "PETITION",
      subject: "",
      description: "",
    });
    this.createVisible.set(true);
  }

  saveCreate(): void {
    if (this.createForm.invalid || this.savingCreate()) {
      this.createForm.markAllAsTouched();
      return;
    }
    const v = this.createForm.getRawValue();
    const unit = this.myUnits().find((u) => u.id === v.unitId);
    if (!unit) {
      this.messages.add({ severity: "warn", summary: "Selecciona una unidad" });
      return;
    }
    this.savingCreate.set(true);
    this.service
      .create({
        propertyId: unit.propertyId,
        unitId: unit.id,
        category: v.category,
        subject: v.subject.trim(),
        description: v.description.trim(),
      })
      .subscribe({
        next: () => {
          this.savingCreate.set(false);
          this.createVisible.set(false);
          this.messages.add({ severity: "success", summary: "PQR enviada" });
          this.loadPqrs();
        },
        error: () => this.savingCreate.set(false),
      });
  }

  openDetail(pqr: Pqr): void {
    this.detail.set(null);
    this.respondForm.reset({ message: "" });
    this.detailVisible.set(true);
    this.loadDetail(pqr.id);
  }

  private loadDetail(id: string): void {
    this.loadingDetail.set(true);
    this.service.getById(id).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.loadingDetail.set(false);
      },
      error: () => this.loadingDetail.set(false),
    });
  }

  submitResponse(): void {
    const current = this.detail();
    if (this.respondForm.invalid || this.responding() || !current) {
      this.respondForm.markAllAsTouched();
      return;
    }
    this.responding.set(true);
    this.service.respond(current.id, this.respondForm.getRawValue().message.trim()).subscribe({
      next: () => {
        this.responding.set(false);
        this.respondForm.reset({ message: "" });
        this.messages.add({ severity: "success", summary: "Respuesta enviada" });
        this.loadDetail(current.id);
      },
      error: () => this.responding.set(false),
    });
  }
}
