import { DatePipe, DecimalPipe } from "@angular/common";
import { Component, OnInit, computed, inject, input, signal } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { SelectModule } from "primeng/select";
import { CheckboxModule } from "primeng/checkbox";
import { MessageService } from "primeng/api";

import { PageHeader } from "../../shared/components/page-header/page-header";
import { EmptyState } from "../../shared/components/empty-state/empty-state";
import { StatusBadge } from "../../shared/components/status-badge/status-badge";
import { UnitService } from "../units/unit.service";
import { Unit } from "../units/unit.models";
import { AssemblyService } from "./assembly.service";
import {
  AssemblyDetail,
  VOTE_CHOICE_OPTIONS,
  VOTING_TYPE_OPTIONS,
  VoteChoice,
  Voting,
  VotingTally,
  VotingType,
  assemblyTypeLabel,
  voteChoiceLabel,
  votingTypeLabel,
} from "./assembly.models";

/**
 * Detalle de una asamblea: estado (SCHEDULED→IN_PROGRESS→CLOSED), asistencia
 * con indicador de quórum, votaciones (crear, votar, cerrar) y escrutinio
 * (conteo por votos y por coeficiente). Recibe `id` del parámetro de ruta.
 */
@Component({
  selector: "app-assembly-detail",
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    CheckboxModule,
    PageHeader,
    EmptyState,
    StatusBadge,
  ],
  templateUrl: "./assembly-detail.html",
})
export class AssemblyDetailPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AssemblyService);
  private readonly unitService = inject(UnitService);
  private readonly messages = inject(MessageService);

  /** Param de ruta (withComponentInputBinding). */
  readonly id = input.required<string>();

  readonly votingTypeOptions = VOTING_TYPE_OPTIONS;
  readonly voteChoiceOptions = VOTE_CHOICE_OPTIONS;
  readonly typeLabel = assemblyTypeLabel;
  readonly votingTypeLabel = votingTypeLabel;
  readonly voteChoiceLabel = voteChoiceLabel;

  readonly detail = signal<AssemblyDetail | null>(null);
  readonly loading = signal(false);
  readonly units = signal<Unit[]>([]);
  private readonly unitById = computed(() => new Map(this.units().map((u) => [u.id, u.code])));
  readonly acting = signal(false);

  /** Quórum: coeficiente presente vs total de coeficientes de las unidades. */
  readonly quorum = computed(() => {
    const d = this.detail();
    if (!d) return null;
    const present = d.attendances.filter((a) => a.present);
    const presentCoef = present.reduce((s, a) => s + Number(a.coefficient), 0);
    const totalCoef = this.units().reduce((s, u) => s + Number(u.coefficient), 0);
    const percent = totalCoef > 0 ? (presentCoef / totalCoef) * 100 : 0;
    const required = d.quorumPercent != null ? Number(d.quorumPercent) : null;
    return {
      presentCount: present.length,
      percent,
      required,
      reached: required == null ? null : percent >= required,
    };
  });

  // Diálogos
  readonly attendanceVisible = signal(false);
  readonly savingAttendance = signal(false);
  readonly votingVisible = signal(false);
  readonly savingVoting = signal(false);
  readonly voteVisible = signal(false);
  readonly savingVote = signal(false);
  readonly tallyVisible = signal(false);
  readonly tally = signal<VotingTally | null>(null);
  readonly voteTargetVoting = signal<Voting | null>(null);

  readonly attendanceForm = this.fb.nonNullable.group({
    unitId: ["", [Validators.required]],
    present: [true],
  });
  readonly votingForm = this.fb.nonNullable.group({
    question: ["", [Validators.required, Validators.maxLength(300)]],
    type: ["COEFFICIENT" as VotingType, [Validators.required]],
  });
  readonly voteForm = this.fb.nonNullable.group({
    unitId: ["", [Validators.required]],
    choice: ["YES" as VoteChoice, [Validators.required]],
  });

  ngOnInit(): void {
    this.loadDetail();
  }

  private loadDetail(): void {
    this.loading.set(true);
    this.service.getById(this.id()).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.loading.set(false);
        if (!this.units().length) {
          this.unitService
            .list(d.propertyId, { page: 1, pageSize: 100, sortBy: "code", sortOrder: "asc" })
            .subscribe({ next: (res) => this.units.set(res.items) });
        }
      },
      error: () => this.loading.set(false),
    });
  }

  unitName(id: string): string {
    return this.unitById().get(id) ?? "—";
  }

  // ===== Estado =====
  start(): void {
    this.changeStatus("IN_PROGRESS", "Asamblea iniciada");
  }
  close(): void {
    this.changeStatus("CLOSED", "Asamblea cerrada");
  }
  private changeStatus(status: "IN_PROGRESS" | "CLOSED", summary: string): void {
    if (this.acting()) return;
    this.acting.set(true);
    this.service.updateStatus(this.id(), status).subscribe({
      next: () => {
        this.acting.set(false);
        this.messages.add({ severity: "success", summary });
        this.loadDetail();
      },
      error: () => this.acting.set(false),
    });
  }

  // ===== Asistencia =====
  openAttendance(): void {
    this.attendanceForm.reset({ unitId: "", present: true });
    this.attendanceVisible.set(true);
  }
  saveAttendance(): void {
    if (this.attendanceForm.invalid || this.savingAttendance()) {
      this.attendanceForm.markAllAsTouched();
      return;
    }
    this.savingAttendance.set(true);
    const v = this.attendanceForm.getRawValue();
    this.service.registerAttendance(this.id(), { unitId: v.unitId, present: v.present }).subscribe({
      next: () => {
        this.savingAttendance.set(false);
        this.attendanceVisible.set(false);
        this.messages.add({ severity: "success", summary: "Asistencia registrada" });
        this.loadDetail();
      },
      error: () => this.savingAttendance.set(false),
    });
  }

  // ===== Votaciones =====
  openVoting(): void {
    this.votingForm.reset({ question: "", type: "COEFFICIENT" });
    this.votingVisible.set(true);
  }
  saveVoting(): void {
    if (this.votingForm.invalid || this.savingVoting()) {
      this.votingForm.markAllAsTouched();
      return;
    }
    this.savingVoting.set(true);
    const v = this.votingForm.getRawValue();
    this.service.createVoting(this.id(), { question: v.question.trim(), type: v.type }).subscribe({
      next: () => {
        this.savingVoting.set(false);
        this.votingVisible.set(false);
        this.messages.add({ severity: "success", summary: "Votación creada" });
        this.loadDetail();
      },
      error: () => this.savingVoting.set(false),
    });
  }

  closeVoting(voting: Voting): void {
    if (this.acting()) return;
    this.acting.set(true);
    this.service.closeVoting(voting.id).subscribe({
      next: () => {
        this.acting.set(false);
        this.messages.add({ severity: "success", summary: "Votación cerrada" });
        this.loadDetail();
      },
      error: () => this.acting.set(false),
    });
  }

  // ===== Votar =====
  openVote(voting: Voting): void {
    this.voteTargetVoting.set(voting);
    this.voteForm.reset({ unitId: "", choice: "YES" });
    this.voteVisible.set(true);
  }
  saveVote(): void {
    const voting = this.voteTargetVoting();
    if (this.voteForm.invalid || this.savingVote() || !voting) {
      this.voteForm.markAllAsTouched();
      return;
    }
    this.savingVote.set(true);
    const v = this.voteForm.getRawValue();
    this.service.castVote(voting.id, { unitId: v.unitId, choice: v.choice }).subscribe({
      next: () => {
        this.savingVote.set(false);
        this.voteVisible.set(false);
        this.messages.add({ severity: "success", summary: "Voto registrado" });
      },
      error: () => this.savingVote.set(false),
    });
  }

  // ===== Resultados =====
  openTally(voting: Voting): void {
    this.tally.set(null);
    this.tallyVisible.set(true);
    this.service.tally(voting.id).subscribe({ next: (t) => this.tally.set(t) });
  }
}
