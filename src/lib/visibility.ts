import type { AthleteGroup } from "@prisma/client";
import { prisma } from "./db";
import { visibleGroups } from "./roles";

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

export type CalendarViewer = { id: string; role: "ADMIN" | "TRAINER" | "ATHLETE"; athleteGroup: AthleteGroup | null; trial: boolean; groups: AthleteGroup[] };

/** Brugerens rolle, gruppe og de grupper, hvis træninger brugeren må se. null-id = besøgende. */
export async function calendarViewer(userId: string | null | undefined): Promise<CalendarViewer | null> {
  if (!userId) return null;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, athleteGroup: true, deletedAt: true } });
  if (!u || u.deletedAt) return null;
  const trial = u.role === "ATHLETE" && (await isTrialOnly(u.id));
  return { id: u.id, role: u.role, athleteGroup: u.athleteGroup, trial, groups: visibleGroups(u, trial) };
}

/** Grupper for en bruger, eller for besøgende. */
export async function groupsFor(userId: string | null | undefined): Promise<AthleteGroup[]> {
  return (await calendarViewer(userId))?.groups ?? visibleGroups(null);
}
