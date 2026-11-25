import type { AthleteGroup, Role } from "@prisma/client";
import { hasRole } from "./roles";

// Klubbens egne hold. Hvert hold har en type (elite, bredde eller børn), som styrer børnebeskyttelse, chatrum m.m.
// Hvem der ser hvad, styres af holdet: man ser sit eget hold og de hold, holdet er sat til at se.

export type TeamLite = { id: string; name: string; kind: AthleteGroup; sees: string[]; public: boolean; active: boolean };
type Viewer = { role: Role; teamId: string | null };

/**
 * Hvilke holds træninger må man se? Admin og trænere ser alle hold. Et medlem ser sit eget hold og de hold,
 * holdet ser. Prøvemedlemmer, medlemmer uden hold og besøgende ser de åbne hold.
 */
export function visibleTeams(user: Viewer | null, teams: TeamLite[], trial = false): string[] {
  // Børnesikkerhed: børnehold er aldrig åbne, og børn og voksne ser aldrig hinandens hold (kun trænere og admin ser begge)
  const open = teams.filter((t) => t.public && t.active && t.kind !== "BOERN").map((t) => t.id);
  if (!user) return open;
  if (hasRole(user.role, "TRAINER")) return teams.map((t) => t.id);
  const own = teams.find((t) => t.id === user.teamId);
  if (trial || !own) return own?.kind === "BOERN" ? [own.id] : open;
  const ids = new Set([own.id, ...own.sees]);
  return teams.filter((t) => ids.has(t.id) && sameSide(t, own)).map((t) => t.id);
}

/** Børnehold og voksenhold kan ikke se hinanden. */
export const sameSide = (a: { kind: AthleteGroup }, b: { kind: AthleteGroup }) => (a.kind === "BOERN") === (b.kind === "BOERN");

/** Atleter kan kun tilmelde sig eget holds træninger (og kun dem, de må se). Trænere og admins kan tilmelde sig alle. */
export function canJoinTeam(user: Viewer, teamId: string | null, teams: TeamLite[], trial = false): boolean {
  if (hasRole(user.role, "TRAINER")) return true;
  return !!teamId && user.teamId === teamId && visibleTeams(user, teams, trial).includes(teamId);
}

/** Hold-id ud fra tekst, fx "Elite", "U17" eller en gammel gruppe som "BREDDE". */
export function matchTeam(text: string, teams: TeamLite[]): TeamLite | null {
  const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ø/g, "o").replace(/æ/g, "ae").replace(/å/g, "a").replace(/[^a-z0-9]/g, "");
  const n = norm(text);
  if (!n) return null;
  const active = teams.filter((t) => t.active);
  return active.find((t) => norm(t.name) === n) ?? active.find((t) => norm(t.kind) === n) ?? null;
}
