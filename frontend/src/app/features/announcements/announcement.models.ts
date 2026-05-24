export type AnnouncementScope = "PROPERTY" | "TOWER" | "UNIT";

/** Comunicado publicado a una copropiedad, torre o unidad. */
export interface Announcement {
  id: string;
  companyId: string;
  propertyId: string;
  towerId: string | null;
  unitId: string | null;
  createdById: string;
  scope: AnnouncementScope;
  title: string;
  body: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementPayload {
  propertyId: string;
  scope: AnnouncementScope;
  title: string;
  body: string;
  towerId?: string;
  unitId?: string;
}

export const ANNOUNCEMENT_SCOPE_OPTIONS: { label: string; value: AnnouncementScope }[] = [
  { label: "Toda la copropiedad", value: "PROPERTY" },
  { label: "Una torre", value: "TOWER" },
  { label: "Una unidad", value: "UNIT" },
];

const SCOPE_LABELS: Record<AnnouncementScope, string> = {
  PROPERTY: "Copropiedad",
  TOWER: "Torre",
  UNIT: "Unidad",
};

export function announcementScopeLabel(scope: AnnouncementScope): string {
  return SCOPE_LABELS[scope] ?? scope;
}
