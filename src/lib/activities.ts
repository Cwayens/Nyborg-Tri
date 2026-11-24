import type { Activity, Discipline, Provider } from "@prisma/client";

export const SPORTS: Discipline[] = ["SWIM", "BIKE", "RUN", "STRENGTH", "OTHER"];

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h} t ${m.toString().padStart(2, "0")} min` : `${m} min`;
}

export function formatHours(sec: number): string {
  return (sec / 3600).toLocaleString("da-DK", { maximumFractionDigits: 1 }) + " t";
}

export function formatDistance(m: number, sport: Discipline): string {
  if (!m) return "";
  if (sport === "SWIM") return `${m.toLocaleString("da-DK")} m`;
  return `${(m / 1000).toLocaleString("da-DK", { maximumFractionDigits: 1 })} km`;
}

/** Tempo/fart afhængigt af sport: svøm pr. 100 m, løb pr. km, cykel km/t. */
export function formatPace(sec: number, m: number, sport: Discipline): string {
  if (!m || !sec) return "";
  if (sport === "SWIM") {
    const s = (sec / m) * 100;
    return `${Math.floor(s / 60)}:${Math.round(s % 60).toString().padStart(2, "0")} /100 m`;
  }
  if (sport === "RUN") {
    const s = (sec / m) * 1000;
    return `${Math.floor(s / 60)}:${Math.round(s % 60).toString().padStart(2, "0")} /km`;
  }
  if (sport === "BIKE") return `${((m / sec) * 3.6).toLocaleString("da-DK", { maximumFractionDigits: 1 })} km/t`;
  return "";
}

/**
 * Må aktiviteten vises for andre medlemmer (klubstatistik)?
 * Kræver medlemmets samtykke. Strava-data vises kun for ejeren selv, jf. Stravas API-vilkår.
 */
export const CLUB_SHAREABLE: Record<Provider, boolean> = {
  MANUAL: true, GARMIN: true, POLAR: true, SUUNTO: true, COROS: true, WAHOO: true, TRAININGPEAKS: true, STRAVA: false,
};

export function visibleToClub(a: Pick<Activity, "provider">, userShares: boolean): boolean {
  return userShares && CLUB_SHAREABLE[a.provider];
}

export type Totals = Record<Discipline, { sec: number; m: number; count: number }>;

export function emptyTotals(): Totals {
  return Object.fromEntries(SPORTS.map((s) => [s, { sec: 0, m: 0, count: 0 }])) as Totals;
}

export function sumBySport(acts: Pick<Activity, "sport" | "movingSec" | "distanceM">[]): Totals {
  const t = emptyTotals();
  for (const a of acts) {
    t[a.sport].sec += a.movingSec;
    t[a.sport].m += a.distanceM;
    t[a.sport].count += 1;
  }
  return t;
}

/** Mandag kl. 00 (dansk tid er tæt nok til ugegrænser) for den uge datoen ligger i. */
export function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const day = (r.getDay() + 6) % 7;
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - day);
  return r;
}
