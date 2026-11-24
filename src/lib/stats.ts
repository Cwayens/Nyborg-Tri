import type { AthleteGroup, Discipline } from "@prisma/client";
import { prisma } from "./db";
import { CLUB_SHAREABLE, startOfWeek, sumBySport } from "./activities";
import type { WeekData } from "@/components/WeekChart";

export async function personalWeeks(userId: string, n = 8): Promise<WeekData[]> {
  const start = startOfWeek(new Date());
  start.setDate(start.getDate() - 7 * (n - 1));
  const acts = await prisma.activity.findMany({ where: { userId, startAt: { gte: start } }, select: { sport: true, movingSec: true, startAt: true } });
  const weeks: WeekData[] = Array.from({ length: n }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + 7 * i);
    return { label: i === n - 1 ? "Nu" : `${d.getDate()}/${d.getMonth() + 1}`, bySport: {} };
  });
  for (const a of acts) {
    const i = Math.floor((startOfWeek(a.startAt).getTime() - start.getTime()) / (7 * 24 * 3600 * 1000));
    if (i >= 0 && i < n) weeks[i].bySport[a.sport] = (weeks[i].bySport[a.sport] ?? 0) + a.movingSec;
  }
  return weeks;
}

export async function personalTotals(userId: string, from: Date) {
  const acts = await prisma.activity.findMany({ where: { userId, startAt: { gte: from } }, select: { sport: true, movingSec: true, distanceM: true } });
  return { totals: sumBySport(acts), sec: acts.reduce((s, a) => s + a.movingSec, 0), count: acts.length };
}

export type LeaderRow = { userId: string; name: string; group: AthleteGroup | null; sec: number; bySport: Record<Discipline, number>; km: number };

/** Klubstatistik: kun medlemmer der har sagt ja til deling, og kun data fra kilder der må deles. */
export async function clubLeaderboard(from: Date, group: AthleteGroup | null): Promise<LeaderRow[]> {
  const providers = Object.entries(CLUB_SHAREABLE).filter(([, ok]) => ok).map(([p]) => p) as (keyof typeof CLUB_SHAREABLE)[];
  const acts = await prisma.activity.findMany({
    where: { startAt: { gte: from }, provider: { in: providers }, user: { shareActivities: true, ...(group ? { athleteGroup: group } : {}) } },
    select: { userId: true, sport: true, movingSec: true, distanceM: true, user: { select: { name: true, athleteGroup: true } } },
  });
  const rows = new Map<string, LeaderRow>();
  for (const a of acts) {
    const r = rows.get(a.userId) ?? {
      userId: a.userId, name: a.user.name ?? "Medlem", group: a.user.athleteGroup, sec: 0, km: 0,
      bySport: { SWIM: 0, BIKE: 0, RUN: 0, STRENGTH: 0, OTHER: 0 },
    };
    r.sec += a.movingSec;
    r.km += a.distanceM / 1000;
    r.bySport[a.sport] += a.movingSec;
    rows.set(a.userId, r);
  }
  return [...rows.values()].sort((a, b) => b.sec - a.sec);
}
