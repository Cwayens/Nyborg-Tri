import type { Discipline } from "@prisma/client";
import { formatDuration } from "./benchmarks";

// Makker-match: medlemmer med samme sport, tempo og tidspunkter finder hinanden.

export const TIMES = { MORGEN: "Morgen", DAG: "Dag", AFTEN: "Aften", WEEKEND: "Weekend" } as const;
export type Time = keyof typeof TIMES;

export type Buddy = { userId: string; disciplines: Discipline[]; runPace: number | null; bikeSpeed: number | null; swimPace: number | null; times: string[] };

// Hvor langt fra hinanden tempoet må være for at kunne træne sammen
const TOL = { run: 30, bike: 3, swim: 12 };

/** "5:30" → 330 sekunder. Tomt eller ugyldigt → null. */
export function parseMinSec(v: string | null | undefined): number | null {
  const m = /^\s*(\d{1,2})[:.,](\d{2})\s*$/.exec(v ?? "");
  return m && Number(m[2]) < 60 ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export const minSec = (s: number | null) => (s ? formatDuration(s) : "");

/** Fælles sportsgrene, hvor tempoet passer, og fælles tidspunkter. Score 0 = intet match. */
export function matchBuddy(me: Buddy, other: Buddy): { score: number; sports: Discipline[]; times: string[] } {
  const sports = me.disciplines.filter((d) => other.disciplines.includes(d)).filter((d) => {
    if (d === "RUN") return !me.runPace || !other.runPace || Math.abs(me.runPace - other.runPace) <= TOL.run;
    if (d === "BIKE") return !me.bikeSpeed || !other.bikeSpeed || Math.abs(me.bikeSpeed - other.bikeSpeed) <= TOL.bike;
    if (d === "SWIM") return !me.swimPace || !other.swimPace || Math.abs(me.swimPace - other.swimPace) <= TOL.swim;
    return true;
  });
  const times = me.times.filter((t) => other.times.includes(t));
  if (!sports.length) return { score: 0, sports, times };
  // Tempo tæt på giver flere point end bare inden for grænsen
  const close = (a: number | null, b: number | null, tol: number) => (a && b ? 1 - Math.abs(a - b) / (tol * 2) : 0.5);
  const pace = sports.reduce((s, d) => s + (d === "RUN" ? close(me.runPace, other.runPace, TOL.run) : d === "BIKE" ? close(me.bikeSpeed, other.bikeSpeed, TOL.bike) : d === "SWIM" ? close(me.swimPace, other.swimPace, TOL.swim) : 0.5), 0);
  return { score: Math.round((sports.length * 2 + pace + times.length) * 10) / 10, sports, times };
}
