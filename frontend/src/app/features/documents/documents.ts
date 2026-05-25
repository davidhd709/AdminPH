import { DatePipe } from "@angular/common";
import { Component, OnInit, ViewChild, inject, signal } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Table, TableLazyLoadEvent, TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { TextareaModule } from "primeng/textarea";
import { SelectModule } from "primeng/select";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { ConfirmationService, MessageService } from "primeng/api";

import { PageHeader } from "../../shared/components/page-header/page-header";
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { DEFAULT_PAGE_SIZE, PageQuery } from "../../core/http/pagination";
import { PropertyService } from "../properties/property.service";
import { Property } from "../properties/property.models";
import { DocumentService } from "./document.service";
import {
  AppDocument,
  DOCUMENT_TYPE_OPTIONS,
  DocumentType,
  documentTypeLabel,
} from "./document.models";

/**
 * Documentos de la copropiedad (Operación). Repositorio de metadatos + URL del
 * archivo (el upload binario real es deuda del backend). Lista con filtros,
 * crear, nueva versión, abrir (enlace) y eliminar.
 */
@Component({
  selector: "app-documents",
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
    ConfirmDialogModule,
    PageHeader,
    EmptyState,
  ],
  providers: [ConfirmationService],
  templateUrl: "./documents.html",
})
export class Documents implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(DocumentService);
  private readonly propertyService = inject(PropertyService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly typeOptions = DOCUMENT_TYPE_OPTIONS;
  readonly typeLabel = documentTypeLabel;

  readonly properties = signal<Property[]>([]);
  readonly filterPropertyId = signal<string | null>(null);
  readonly filterType = signal<DocumentType | null>(null);

  readonly documents = signal<AppDocument[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly pageSize = DEFAULT_PAGE_SIZE;
  private lastQuery: PageQuery = { page: 1, pageSize: this.pageSize, sortOrder: "desc" };

  readonly createVisible = signal(false);
  readonly savingCreate = signal(false);
  readonly createForm = this.fb.nonNullable.group({
    propertyId: ["", [Validators.required]],
    type: ["REGULATION" as DocumentType, [Validators.required]],
    title: ["", [Validators.required, Validators.maxLength(200)]],
    fileUrl: ["", [Validators.required, Validators.maxLength(1000)]],
    description: [""],
  });

  readonly versionVisible = signal(false);
  readonly savingVersion = signal(false);
  private versionTargetId: string | null = null;
  readonly versionForm = this.fb.nonNullable.group({
    fileUrl: ["", [Validators.required, Validators.maxLength(1000)]],
    description: [""],
  });

  ngOnInit(): void {
    this.propertyService
      .list({ page: 1, pageSize: 100, sortBy: "name", sortOrder: "asc" })
      .subscribe({ next: (res) => this.properties.set(res.items) });
  }

  applyFilters(): void {
    if (this.table) this.table.reset();
    else this.fetch();
  }

  @ViewChild(Table) private table?: Table;

  loadLazy(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.pageSize;
    const first = event.first ?? 0;
    const sortField = Array.isArray(event.sortField) ? event.sortField[0] : event.sortField;
    this.lastQuery = {
      page: Math.floor(first / rows) + 1,
      pageSize: rows,
      sortBy: sortField || undefined,
      sortOrder: event.sortOrder === 1 ? "asc" : "desc",
    };
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.service
      .list({
        ...this.lastQuery,
        propertyId: this.filterPropertyId() ?? undefined,
        type: this.filterType() ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.documents.set(res.items);
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  openFile(doc: AppDocument): void {
    window.open(doc.fileUrl, "_blank", "noopener");
  }

  // ===== Crear =====
  openCreate(): void {
    this.createForm.reset({
      propertyId: this.filterPropertyId() ?? "",
      type: "REGULATION",
      title: "",
      fileUrl: "",
      description: "",
    });
    this.createVisible.set(true);
  }

  saveCreate(): void {
    if (this.createForm.invalid || this.savingCreate()) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.savingCreate.set(true);
    const v = this.createForm.getRawValue();
    this.service
      .create({
        propertyId: v.propertyId,
        type: v.type,
        title: v.title.trim(),
        fileUrl: v.fileUrl.trim(),
        description: v.description.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.savingCreate.set(false);
          this.createVisible.set(false);
          this.messages.add({ severity: "success", summary: "Documento creado" });
          this.applyFilters();
        },
        error: () => this.savingCreate.set(false),
      });
  }

  // ===== Nueva versión =====
  openVersion(doc: AppDocument): void {
    this.versionTargetId = doc.id;
    this.versionForm.reset({ fileUrl: "", description: "" });
    this.versionVisible.set(true);
  }

  saveVersion(): void {
    if (this.versionForm.invalid || this.savingVersion() || !this.versionTargetId) {
      this.versionForm.markAllAsTouched();
      return;
    }
    this.savingVersion.set(true);
    const v = this.versionForm.getRawValue();
    this.service
      .newVersion(this.versionTargetId, {
        fileUrl: v.fileUrl.trim(),
        description: v.description.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.savingVersion.set(false);
          this.versionVisible.set(false);
          this.messages.add({ severity: "success", summary: "Nueva versión registrada" });
          this.fetch();
        },
        error: () => this.savingVersion.set(false),
      });
  }

  // ===== Eliminar =====
  confirmDelete(doc: AppDocument): void {
    this.confirm.confirm({
      header: "Eliminar documento",
      message: `¿Seguro que deseas eliminar "${doc.title}"?`,
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Eliminar",
      rejectLabel: "Cancelar",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => {
        this.service.remove(doc.id).subscribe({
          next: () => {
            this.messages.add({ severity: "success", summary: "Documento eliminado" });
            this.fetch();
          },
        });
      },
    });
  }
}
