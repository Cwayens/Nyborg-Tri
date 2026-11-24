import type { AthleteGroup, Discipline, Role } from "@prisma/client";

// De fem brugertyper: Admin, Træner og Atlet (Elite, Bredde, Børn).
// Rolle styrer rettigheder; atletgruppe styrer hvilke træninger man ser.

export const ROLE_LABEL: Record<Role, string> = { ADMIN: "Admin", TRAINER: "Træner", ATHLETE: "Atlet" };
export const GROUP_LABEL: Record<AthleteGroup, string> = { ELITE: "Elite", BREDDE: "Bredde", BOERN: "Børn" };
export const GROUPS: AthleteGroup[] = ["ELITE", "BREDDE", "BOERN"];
export const ROLES: Role[] = ["ATHLETE", "TRAINER", "ADMIN"];

export const DISCIPLINE_LABEL: Record<Discipline, string> = {
  SWIM: "Svømning", BIKE: "Cykling", RUN: "Løb", STRENGTH: "Styrke", OTHER: "Andet",
};

const RANK: Record<Role, number> = { ATHLETE: 0, TRAINER: 1, ADMIN: 2 };

export function hasRole(role: Role | undefined, min: Role): boolean {
  return role !== undefined && RANK[role] >= RANK[min];
}

export function userTypeLabel(role: Role, group: AthleteGroup | null): string {
  if (role === "ATHLETE") return group ? `Atlet – ${GROUP_LABEL[group]}` : "Atlet";
  return ROLE_LABEL[role];
}

/** Gruppe nye betalende medlemmer får, hvis admin ikke har sat en. */
export function defaultGroupFor(membershipCode: string): AthleteGroup {
  return membershipCode === "YOUTH" ? "BOERN" : "BREDDE";
}

/** Er træningen relevant for en atlet i denne gruppe? Tom gruppeliste = for alle. */
export function trainingVisibleFor(groups: AthleteGroup[], group: AthleteGroup | null): boolean {
  return groups.length === 0 || group === null || groups.includes(group);
}
