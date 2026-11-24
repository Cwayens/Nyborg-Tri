import type { BenchmarkTest, Discipline, Gender, Provider } from "@prisma/client";
import { LEADERBOARD, TEST_BY_KEY, ftpFromTwenty, score } from "./benchmarks";

// Bedste præstationer udtrukket fra ur-data: hurtigste 5 km i et længere løb, bedste 20 min watt på en tur osv.

export type Streams = { time?: number[]; distance?: number[]; watts?: (number | null)[] };
export type ActivityLike = { sport: Discipline; distanceM: number; movingSec: number; hasPower?: boolean };
export type EffortValue = { test: BenchmarkTest; seconds: number | null; watts: number | null };

/** Hurtigste tid over en distance. Tid og distance er kumulative (som i Strava-streams). */
export function bestForDistance(time: number[], dist: number[], meters: number): number | null {
  const n = Math.min(time.length, dist.length);
  if (n < 2 || dist[n - 1] - dist[0] < meters) return null;
  let best = Infinity;
  let i = 0;
  for (let j = 1; j < n; j++) {
    // Flyt starten frem, så længe stykket stadig er mindst så langt som distancen
    while (i + 1 < j && dist[j] - dist[i + 1] >= meters) i++;
    const d = dist[j] - dist[i];
    if (d < meters) continue;
    // Skaler tilbage til præcis distancen (prøverne ligger sjældent præcist)
    const t = ((time[j] - time[i]) * meters) / d;
    if (t < best) best = t;
  }
  return Number.isFinite(best) ? Math.round(best) : null;
}

/** Højeste gennemsnitlige watt over et tidsrum (standard: 20 min). */
export function bestPower(time: number[], watts: (number | null)[], seconds = 1200): number | null {
  const n = Math.min(time.length, watts.length);
  if (n < 2 || time[n - 1] - time[0] < seconds) return null;
  // Energi akkumuleret; huller over 10 s (pauser) tæller ikke med som watt
  const energy = [0];
  for (let k = 1; k < n; k++) {
    const dt = Math.min(time[k] - time[k - 1], 10);
    energy.push(energy[k - 1] + (watts[k] ?? 0) * dt);
  }
  let best = 0;
  let i = 0;
  for (let j = 1; j < n; j++) {
    while (i + 1 < j && time[j] - time[i + 1] >= seconds) i++;
    const span = time[j] - time[i];
    if (span < seconds) continue;
    best = Math.max(best, (energy[j] - energy[i]) / span);
  }
  return best > 0 ? Math.round(best) : null;
}

// Grænser for hvad der er realistisk. Alt udenfor er typisk GPS-fejl eller en cykeltur gemt som løb.
const LIMITS: Partial<Record<BenchmarkTest, [number, number]>> = {
  RUN_5K: [13 * 60, 60 * 60],
  RUN_10K: [27 * 60, 2 * 3600],
  RUN_HALF: [58 * 60, 4 * 3600],
  BIKE_40K: [45 * 60, 3 * 3600],
  BIKE_FTP20: [60, 550], // watt
  SWIM_100: [48, 5 * 60],
  SWIM_1500: [14 * 60, 60 * 60],
};

function plausible(test: BenchmarkTest, v: number): boolean {
  const l = LIMITS[test];
  return !l || (v >= l[0] && v <= l[1]);
}

/** Om en aktivitet kan indeholde en præstation, så det er værd at hente dens data. */
export function worthChecking(a: ActivityLike): boolean {
  return LEADERBOARD.some((t) =>
    t.discipline === a.sport &&
    (t.kind === "watts" ? !!a.hasPower && a.movingSec >= 1200 : a.distanceM >= (t.distanceM ?? Infinity)),
  );
}

/** Alle præstationer i én aktivitet. Uden streams bruges hele turen, hvis den har præcis en testdistance. */
export function extractEfforts(a: ActivityLike, s: Streams | null): EffortValue[] {
  const out: EffortValue[] = [];
  for (const t of LEADERBOARD) {
    if (t.discipline !== a.sport) continue;
    if (t.kind === "watts") {
      const w = s?.time && s.watts ? bestPower(s.time, s.watts) : null;
      if (w && plausible(t.test, w)) out.push({ test: t.test, seconds: null, watts: w });
      continue;
    }
    const meters = t.distanceM!;
    let sec = s?.time && s.distance ? bestForDistance(s.time, s.distance, meters) : null;
    // Fx svøm i bassin uden distance-stream: brug hele turen, hvis længden passer
    if (sec == null && a.distanceM >= meters && a.distanceM <= meters * 1.02) sec = a.movingSec;
    if (sec != null && plausible(t.test, sec)) out.push({ test: t.test, seconds: sec, watts: null });
  }
  return out;
}

/**
 * Kilder der må vises for andre medlemmer på leaderboardet. Stravas API-aftale (fra nov. 2024) tillader kun at vise
 * en brugers Strava-data for brugeren selv, så Strava er slået fra, indtil klubben har skriftlig accept fra Strava
 * (STRAVA_LEADERBOARD=1). I testversionen er alt testdata, så den er slået til.
 */
export function leaderboardProviders(env: Record<string, string | undefined> = process.env): Provider[] {
  const list: Provider[] = ["GARMIN", "POLAR", "SUUNTO", "COROS", "WAHOO"];
  if (env.STRAVA_LEADERBOARD === "1" || env.DEMO_MODE === "1") list.push("STRAVA");
  return list;
}

// --- Aldersgrupper som hos Ironman: alder pr. 31. december i året, 5-års grupper fra 18 ---

export const AGE_GROUPS = ["18-24", "25-29", "30-34", "35-39", "40-44", "45-49", "50-54", "55-59", "60-64", "65-69", "70-74", "75-79", "80+"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export function ageGroup(birthDate: Date | null, year: number): AgeGroup | null {
  if (!birthDate) return null;
  const age = year - birthDate.getFullYear();
  if (age < 18) return null;
  if (age < 25) return "18-24";
  if (age >= 80) return "80+";
  const low = Math.floor(age / 5) * 5;
  return `${low}-${low + 4}` as AgeGroup;
}

export const GENDER_LABEL: Record<Gender, string> = { MALE: "Mænd", FEMALE: "Kvinder" };
export const GENDER_PREFIX: Record<Gender, string> = { MALE: "M", FEMALE: "K" };

// --- Ranglister ---

export type Athlete = { id: string; name: string | null; gender: Gender; birthDate: Date; weightKg?: number | null };

/** FTP i watt pr. kg (FTP = 95 % af bedste 20 min). */
export function wattsPerKg(watts20: number, kg: number): number {
  return ftpFromTwenty(watts20) / kg;
}

export function formatWkg(v: number): string {
  return `${v.toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} W/kg`;
}

/** Rangering: FTP sammenlignes i W/kg, alt andet som det er. */
function rankScore(r: Ranked): number {
  if (r.best.watts && r.athlete.weightKg) return wattsPerKg(r.best.watts, r.athlete.weightKg);
  return score(r.best);
}
export type EffortRow = EffortValue & { userId: string; date: Date };

export type Ranked = { athlete: Athlete; ag: AgeGroup; best: EffortRow; previous?: EffortRow; improvement?: number };

function bestPerUser(rows: EffortRow[]): Map<string, EffortRow> {
  const m = new Map<string, EffortRow>();
  for (const r of rows) {
    const cur = m.get(r.userId);
    if (!cur || score(r) > score(cur)) m.set(r.userId, r);
  }
  return m;
}

/** Fremgang i procent fra forrige til nyeste (positivt = bedre). Tid: kortere, watt: højere. */
export function improvementPct(prev: EffortValue, cur: EffortValue): number {
  if (TEST_BY_KEY[cur.test].kind === "watts") return ((cur.watts! - prev.watts!) / prev.watts!) * 100;
  return ((prev.seconds! - cur.seconds!) / prev.seconds!) * 100;
}

/** Årets bedste pr. atlet, sorteret. FTP rangeres i W/kg, så kun atleter med vægt kommer med der. */
export function rankBest(athletes: Athlete[], rows: EffortRow[], year: number): Ranked[] {
  if (rows.some((r) => TEST_BY_KEY[r.test].kind === "watts")) athletes = athletes.filter((a) => a.weightKg);
  const best = bestPerUser(rows.filter((r) => r.date.getFullYear() === year));
  return rank(athletes, year, (a) => {
    const b = best.get(a.id);
    return b && { best: b };
  }).sort((x, y) => rankScore(y) - rankScore(x));
}

/** Mest fremgang: årets bedste mod sidste års bedste. */
export function rankImprovement(athletes: Athlete[], rows: EffortRow[], year: number): Ranked[] {
  if (rows.some((r) => TEST_BY_KEY[r.test].kind === "watts")) athletes = athletes.filter((a) => a.weightKg);
  const now = bestPerUser(rows.filter((r) => r.date.getFullYear() === year));
  const before = bestPerUser(rows.filter((r) => r.date.getFullYear() === year - 1));
  return rank(athletes, year, (a) => {
    const b = now.get(a.id);
    const p = before.get(a.id);
    return b && p && { best: b, previous: p, improvement: improvementPct(p, b) };
  }).sort((x, y) => y.improvement! - x.improvement!);
}

function rank(athletes: Athlete[], year: number, pick: (a: Athlete) => Omit<Ranked, "athlete" | "ag"> | undefined | null): Ranked[] {
  const out: Ranked[] = [];
  for (const a of athletes) {
    const ag = ageGroup(a.birthDate, year);
    const r = ag && pick(a);
    if (ag && r) out.push({ athlete: a, ag, ...r });
  }
  return out;
}
