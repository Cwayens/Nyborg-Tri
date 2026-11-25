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
export const DISCIPLINE_LABEL_EN: Record<Discipline, string> = {
  SWIM: "Swimming", BIKE: "Cycling", RUN: "Running", STRENGTH: "Strength", OTHER: "Other",
};
/** Disciplinens navn på det valgte sprog */
export const disciplineLabel = (d: Discipline, loc: "da" | "en" = "da") => (loc === "en" ? DISCIPLINE_LABEL_EN : DISCIPLINE_LABEL)[d];

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

/** Vises træningen, når kalenderen er filtreret til en gruppe? null = alle grupper. */
export function trainingVisibleFor(trainingGroup: AthleteGroup, filter: AthleteGroup | null): boolean {
  return filter === null || trainingGroup === filter;
}

type Viewer = { role: Role; athleteGroup: AthleteGroup | null };

/**
 * Hvilke gruppers træninger må man se i kalenderen? Klubbens regler:
 * admin og trænere ser alt, elite ser elite og bredde, bredde ser bredde, børn ser børn,
 * og prøvemedlemmer, medlemmer uden gruppe og besøgende ser kun bredde.
 */
export function visibleGroups(user: Viewer | null, trial = false): AthleteGroup[] {
  if (!user) return ["BREDDE"];
  if (hasRole(user.role, "TRAINER")) return GROUPS;
  if (trial) return ["BREDDE"];
  if (user.athleteGroup === "ELITE") return ["ELITE", "BREDDE"];
  if (user.athleteGroup === "BOERN") return ["BOERN"];
  return ["BREDDE"];
}

/** Atleter kan kun tilmelde sig træninger for egen gruppe (og kun dem, de må se). Trænere og admins kan tilmelde sig alle. */
export function canJoinGroup(user: Viewer, trainingGroup: AthleteGroup, trial = false): boolean {
  return hasRole(user.role, "TRAINER") || (user.athleteGroup === trainingGroup && visibleGroups(user, trial).includes(trainingGroup));
}
