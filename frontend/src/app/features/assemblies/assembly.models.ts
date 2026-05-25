export type AssemblyType = "ORDINARY" | "EXTRAORDINARY";
export type AssemblyStatus = "SCHEDULED" | "IN_PROGRESS" | "CLOSED";
export type VotingType = "SIMPLE" | "COEFFICIENT";
export type VotingStatus = "OPEN" | "CLOSED";
export type VoteChoice = "YES" | "NO" | "ABSTAIN" | "BLANK";

export interface Assembly {
  id: string;
  companyId: string;
  propertyId: string;
  createdById: string;
  title: string;
  type: AssemblyType;
  agenda: string | null;
  scheduledAt: string;
  quorumPercent: string | null;
  status: AssemblyStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AssemblyAttendance {
  id: string;
  assemblyId: string;
  unitId: string;
  coefficient: string;
  present: boolean;
  proxyUserId: string | null;
  registeredAt: string;
}

export interface Voting {
  id: string;
  assemblyId: string;
  question: string;
  type: VotingType;
  status: VotingStatus;
  createdAt: string;
  closedAt: string | null;
}

/** Detalle (GET /assemblies/:id): incluye asistencias y votaciones. */
export interface AssemblyDetail extends Assembly {
  attendances: AssemblyAttendance[];
  votings: Voting[];
}

/** Escrutinio de una votación (GET .../results). */
export interface VotingTally {
  votingId: string;
  type: VotingType;
  status: VotingStatus;
  byCount: Record<VoteChoice, number>;
  byCoefficient: Record<VoteChoice, number>;
  totals: { totalVotes: number; totalCoefficient: number };
}

export interface CreateAssemblyPayload {
  propertyId: string;
  title: string;
  type?: AssemblyType;
  agenda?: string;
  scheduledAt: string;
  quorumPercent?: number;
}

export interface RegisterAttendancePayload {
  unitId: string;
  present?: boolean;
  proxyUserId?: string;
}

export interface CreateVotingPayload {
  question: string;
  type?: VotingType;
}

export interface CastVotePayload {
  unitId: string;
  choice: VoteChoice;
}

export const ASSEMBLY_TYPE_OPTIONS: { label: string; value: AssemblyType }[] = [
  { label: "Ordinaria", value: "ORDINARY" },
  { label: "Extraordinaria", value: "EXTRAORDINARY" },
];

export const ASSEMBLY_STATUS_OPTIONS: { label: string; value: AssemblyStatus }[] = [
  { label: "Programada", value: "SCHEDULED" },
  { label: "En progreso", value: "IN_PROGRESS" },
  { label: "Cerrada", value: "CLOSED" },
];

export const VOTING_TYPE_OPTIONS: { label: string; value: VotingType }[] = [
  { label: "Mayoría simple", value: "SIMPLE" },
  { label: "Por coeficiente", value: "COEFFICIENT" },
];

export const VOTE_CHOICE_OPTIONS: { label: string; value: VoteChoice }[] = [
  { label: "Sí", value: "YES" },
  { label: "No", value: "NO" },
  { label: "Abstención", value: "ABSTAIN" },
  { label: "En blanco", value: "BLANK" },
];

const ASSEMBLY_TYPE_LABELS = new Map(ASSEMBLY_TYPE_OPTIONS.map((o) => [o.value, o.label]));
const VOTING_TYPE_LABELS = new Map(VOTING_TYPE_OPTIONS.map((o) => [o.value, o.label]));
const VOTE_CHOICE_LABELS = new Map(VOTE_CHOICE_OPTIONS.map((o) => [o.value, o.label]));

export function assemblyTypeLabel(type: AssemblyType): string {
  return ASSEMBLY_TYPE_LABELS.get(type) ?? type;
}
export function votingTypeLabel(type: VotingType): string {
  return VOTING_TYPE_LABELS.get(type) ?? type;
}
export function voteChoiceLabel(choice: VoteChoice): string {
  return VOTE_CHOICE_LABELS.get(choice) ?? choice;
}
