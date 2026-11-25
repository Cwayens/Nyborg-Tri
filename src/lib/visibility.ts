import { cache } from "react";
import type { AthleteGroup } from "@prisma/client";
import { prisma } from "./db";
import { canJoinTeam, visibleTeams, type TeamLite } from "./teams";

// Kalenderens synlighedsregler slået op i databasen, så de gælder på serveren uanset hvad sessionen siger.

/** Har medlemmet kun en prøveperiode (og intet betalt medlemskab eller kode) lige nu? */
export async function isTrialOnly(userId: string): Promise<boolean> {
  const now = new Date();
  const active = await prisma.membership.findMany({
    where: { userId, startDate: { lte: now }, endDate: { gt: now }, type: { code: { not: "PASSIVE" } } },
    select: { source: true },
  });
  return active.length > 0 && active.every((m) => m.source === "TRIAL");
}

/** Klubbens hold i sorteret rækkefølge (én gang pr. forespørgsel). */
export const getTeams = cache(async (): Promise<TeamLite[]> =>
  prisma.team.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, name: true, kind: true, sees: true, public: true, active: true } }),
);

/** Holdnavne til visning, slået op på id. */
export async function teamNames(): Promise<Map<string, string>> {
  return new Map((await getTeams()).map((t) => [t.id, t.name]));
}

export type CalendarViewer = {
  id: string; role: "ADMIN" | "TRAINER" | "ATHLETE"; athleteGroup: AthleteGroup | null; teamId: string | null; trial: boolean;
  /** Hold, hvis træninger brugeren må se */
  teams: string[];
};

/** Brugerens rolle, hold og de hold, hvis træninger brugeren må se. null-id = besøgende. */
export const calendarViewer = cache(async (userId: string | null | undefined): Promise<CalendarViewer | null> => {
  if (!userId) return null;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, athleteGroup: true, teamId: true, deletedAt: true } });
  if (!u || u.deletedAt) return null;
  const trial = u.role === "ATHLETE" && (await isTrialOnly(u.id));
  return { id: u.id, role: u.role, athleteGroup: u.athleteGroup, teamId: u.teamId, trial, teams: visibleTeams(u, await getTeams(), trial) };
});

/** Hold for en bruger, eller for besøgende. */
export async function teamsFor(userId: string | null | undefined): Promise<string[]> {
  return (await calendarViewer(userId))?.teams ?? visibleTeams(null, await getTeams());
}

/** Må brugeren tilmelde sig en træning for holdet? */
export async function mayJoin(viewer: CalendarViewer, teamId: string | null): Promise<boolean> {
  return canJoinTeam(viewer, teamId, await getTeams(), viewer.trial);
}
