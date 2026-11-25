import { NOT_CHILD } from "@/lib/child-safety";
import type { Challenge, ChallengeMetric, Provider } from "@prisma/client";
import { prisma } from "./db";
import { leaderboardProviders } from "./efforts";

// Klubudfordringer: fælles mål, hvor alle der er med, bidrager. Klubbens samlede tal bruger kun kilder, der må vises for andre
// (Strava kun med tilladelse, se leaderboardProviders); dit eget bidrag tæller alt og vises kun for dig.

export const METRIC_LABEL: Record<ChallengeMetric, { unit: string; label: string }> = {
  KM: { unit: "km", label: "Kilometer" },
  HOURS: { unit: "timer", label: "Timer" },
  SESSIONS: { unit: "træninger", label: "Antal træninger" },
};

type Act = { userId: string; startAt: Date; distanceM: number; movingSec: number };

export function amount(metric: ChallengeMetric, acts: Act[]): number {
  if (metric === "KM") return acts.reduce((s, a) => s + a.distanceM, 0) / 1000;
  if (metric === "HOURS") return acts.reduce((s, a) => s + a.movingSec, 0) / 3600;
  return acts.length;
}

export type Badge = { key: string; label: string; text: string };

/** Mærker for at være med, ikke for at vinde. */
export function badges(c: Pick<Challenge, "startsAt" | "endsAt">, mine: Act[], clubDone: boolean, now = new Date()): Badge[] {
  if (!mine.length) return [];
  const out: Badge[] = [{ key: "med", label: "Med", text: "Du har bidraget til klubbens mål" }];
  const end = now < c.endsAt ? now : c.endsAt;
  const weeks = Math.max(1, Math.ceil((end.getTime() - c.startsAt.getTime()) / (7 * 864e5)));
  const active = new Set(mine.map((a) => Math.floor((a.startAt.getTime() - c.startsAt.getTime()) / (7 * 864e5))));
  if (weeks >= 2 && active.size >= weeks) out.push({ key: "trofast", label: "Trofast", text: "Du har trænet hver uge i udfordringen" });
  if (mine.length >= 10) out.push({ key: "ti", label: "10 ture", text: "10 træninger eller flere" });
  if (clubDone) out.push({ key: "maal", label: "I nåede det", text: "Klubben nåede målet, og du var med" });
  return out;
}

export async function challengeStatus(c: Challenge, userId: string) {
  const participants = await prisma.challengeParticipant.findMany({ where: { challengeId: c.id, user: NOT_CHILD }, include: { user: { select: { id: true, name: true, deletedAt: true } } }, orderBy: { joinedAt: "asc" } });
  const ids = participants.map((p) => p.userId);
  const where = { userId: { in: ids }, startAt: { gte: c.startsAt, lt: c.endsAt }, ...(c.discipline ? { sport: c.discipline } : {}) };
  const select = { userId: true, startAt: true, distanceM: true, movingSec: true, provider: true } as const;
  const acts = ids.length ? await prisma.activity.findMany({ where, select }) : [];
  const shown: Provider[] = [...leaderboardProviders(), "MANUAL"];
  const club = amount(c.metric, acts.filter((a) => shown.includes(a.provider)));
  const mineActs = acts.filter((a) => a.userId === userId);
  const joined = ids.includes(userId);
  return {
    participants: participants.filter((p) => !p.user.deletedAt).map((p) => ({ id: p.userId, name: p.user.name })),
    joined,
    club,
    mine: amount(c.metric, mineActs),
    pct: Math.min(100, Math.round((club / c.goal) * 100)),
    badges: joined ? badges(c, mineActs, club >= c.goal) : [],
  };
}

export function formatAmount(metric: ChallengeMetric, v: number): string {
  return `${v.toLocaleString("da-DK", { maximumFractionDigits: metric === "SESSIONS" ? 0 : 1 })} ${METRIC_LABEL[metric].unit}`;
}
