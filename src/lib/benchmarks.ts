import type { BenchmarkTest, Discipline } from "@prisma/client";

export type TestDef = {
  test: BenchmarkTest;
  label: string;
  short: string;
  discipline: Discipline;
  kind: "time" | "watts";
  distanceM?: number;
  help: string;
};

export const TESTS: TestDef[] = [
  { test: "RUN_5K", label: "Løb 5 km", short: "5 km", discipline: "RUN", kind: "time", distanceM: 5000, help: "Hurtigst muligt på flad rute eller bane." },
  { test: "RUN_10K", label: "Løb 10 km", short: "10 km", discipline: "RUN", kind: "time", distanceM: 10000, help: "Hurtigst muligt på flad rute eller bane." },
  { test: "BIKE_FTP20", label: "Cykel FTP (20 min)", short: "FTP", discipline: "BIKE", kind: "watts", help: "Gennemsnitlig watt over 20 minutter all out. FTP beregnes som 95 %." },
  { test: "SWIM_100", label: "Svøm 100 m", short: "100 m", discipline: "SWIM", kind: "time", distanceM: 100, help: "Crawl fra start i vandet, 25 eller 50 m bassin." },
  { test: "SWIM_1500", label: "Svøm 1500 m", short: "1500 m", discipline: "SWIM", kind: "time", distanceM: 1500, help: "Crawl i bassin eller åbent vand (skriv det i noten)." },
];

/** Distancerne på leaderboardet: klubbens fem tests plus halvmaraton og 40 km på cykel. */
export const LEADERBOARD: TestDef[] = [
  TESTS[0], TESTS[1],
  { test: "RUN_HALF", label: "Løb halvmaraton", short: "21,1 km", discipline: "RUN", kind: "time", distanceM: 21098, help: "" },
  TESTS[2],
  { test: "BIKE_40K", label: "Cykel 40 km", short: "40 km", discipline: "BIKE", kind: "time", distanceM: 40000, help: "" },
  TESTS[3], TESTS[4],
];

export const TEST_BY_KEY = Object.fromEntries(LEADERBOARD.map((t) => [t.test, t])) as Record<BenchmarkTest, TestDef>;

/** En af klubbens fem tests (Mine tests). */
export function isTest(v: unknown): v is BenchmarkTest {
  return typeof v === "string" && TESTS.some((t) => t.test === v);
}

export function isLeaderboardTest(v: unknown): v is BenchmarkTest {
  return typeof v === "string" && v in TEST_BY_KEY;
}

/** "22:15", "1:42:10", "95" (sekunder) eller "1.32" → sekunder. Ugyldigt giver null. */
export function parseDuration(input: string): number | null {
  const s = input.trim().replace(/[.,]/g, ":");
  if (!/^\d+(:\d{1,2}){0,2}$/.test(s)) return null;
  const parts = s.split(":").map(Number);
  if (parts.slice(1).some((p) => p >= 60)) return null;
  const sec = parts.reduce((acc, p) => acc * 60 + p, 0);
  return sec > 0 && sec < 24 * 3600 ? sec : null;
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export function ftpFromTwenty(watts: number): number {
  return Math.round(watts * 0.95);
}

type Result = { test: BenchmarkTest; seconds: number | null; watts: number | null };

/** Tal der kan sammenlignes: højere er altid bedre (tid gøres negativ). */
export function score(r: Result): number {
  return TEST_BY_KEY[r.test].kind === "watts" ? r.watts ?? 0 : -(r.seconds ?? Infinity);
}

export function formatResult(r: Result): string {
  if (TEST_BY_KEY[r.test].kind === "watts") return r.watts ? `${ftpFromTwenty(r.watts)} W` : "–";
  return r.seconds ? formatDuration(r.seconds) : "–";
}

/** Ekstra linje: tempo for løb (min/km), pr. 100 m for svøm, 20-min-watt for cykel. */
export function formatDetail(r: Result): string {
  const def = TEST_BY_KEY[r.test];
  if (def.kind === "watts") return r.watts ? `${r.watts} W i 20 min` : "";
  if (!r.seconds || !def.distanceM) return "";
  if (def.discipline === "BIKE") return `${(def.distanceM / 1000 / (r.seconds / 3600)).toLocaleString("da-DK", { maximumFractionDigits: 1 })} km/t`;
  if (def.discipline === "RUN") return `${formatDuration(Math.round(r.seconds / (def.distanceM / 1000)))} /km`;
  if (def.distanceM > 100) return `${formatDuration(Math.round(r.seconds / (def.distanceM / 100)))} /100 m`;
  return "";
}

/** Forskel fra forrige til nyeste, som tekst og retning. */
export function change(prev: Result | undefined, latest: Result | undefined): { text: string; better: boolean } | null {
  if (!prev || !latest) return null;
  const def = TEST_BY_KEY[latest.test];
  if (def.kind === "watts") {
    const d = ftpFromTwenty(latest.watts ?? 0) - ftpFromTwenty(prev.watts ?? 0);
    if (d === 0) return { text: "uændret", better: true };
    return { text: `${d > 0 ? "+" : "–"}${Math.abs(d)} W`, better: d > 0 };
  }
  const d = (latest.seconds ?? 0) - (prev.seconds ?? 0);
  if (d === 0) return { text: "uændret", better: true };
  return { text: `${d < 0 ? "–" : "+"}${formatDuration(Math.abs(d))}`, better: d < 0 };
}

/** Finder aktiviteter, der ligner en test (fx et løb på 5,0–5,1 km). */
export function matchTest(a: { sport: Discipline; distanceM: number }): BenchmarkTest | null {
  for (const t of TESTS) {
    if (t.kind !== "time" || !t.distanceM || t.discipline !== a.sport) continue;
    if (a.distanceM >= t.distanceM && a.distanceM <= t.distanceM * 1.02) return t.test;
  }
  return null;
}

/** Kun resultater fra ure tæller (Prisma-filter). Gamle manuelt indtastede resultater vises ikke. */
export const FROM_WEARABLE = { source: { not: "MANUAL" } } as const;
