import { DatePipe } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";

import { PageHeader } from "../../shared/components/page-header/page-header";
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { SectionCard } from "../../shared/components/section-card/section-card";
import { AnnouncementService } from "../announcements/announcement.service";
import { Announcement, announcementScopeLabel } from "../announcements/announcement.models";

/**
 * "Comunicados" (propietario/residente): vista de solo lectura de los
 * comunicados de su copropiedad (el backend scopea a no-staff por sus
 * copropiedades asignadas / empresa). Al abrir uno se marca como leído.
 */
@Component({
  selector: "app-my-announcements",
  imports: [DatePipe, TableModule, ButtonModule, DialogModule, PageHeader, EmptyState, SectionCard],
  templateUrl: "./my-announcements.html",
})
export class MyAnnouncementsPage implements OnInit {
  private readonly service = inject(AnnouncementService);

  readonly scopeLabel = announcementScopeLabel;
  readonly announcements = signal<Announcement[]>([]);
  readonly loading = signal(false);

  readonly detailVisible = signal(false);
  readonly detail = signal<Announcement | null>(null);

  ngOnInit(): void {
    this.loading.set(true);
    this.service.list({ page: 1, pageSize: 100, sortBy: "publishedAt", sortOrder: "desc" }).subscribe({
      next: (res) => {
        this.announcements.set(res.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openDetail(a: Announcement): void {
    this.detail.set(a);
    this.detailVisible.set(true);
    // Abrir un comunicado lo marca como leído (silencioso).
    this.service.markAsRead(a.id).subscribe({ error: () => undefined });
  }
}
