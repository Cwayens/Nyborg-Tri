import type { Discipline } from "@prisma/client";
import type { Locale } from "./i18n-core";

// Mærker og sjove titler efter, hvor mange træninger man har været med til. Tæller klubtræninger, man var tilmeldt
// (ikke aflyste), og ture under Træn sammen, man var med på eller stod for. Vises kun for medlemmet selv.

export type Done = { at: Date; discipline: Discipline; host?: boolean };

export const LEVELS = [
  { at: 1, title: "Våddragts-jomfru", text: "Første træning er i hus. Velkommen i flokken!" },
  { at: 5, title: "Bassin-pirat", text: "Du har fundet vej til klubben fem gange. Det er en vane nu." },
  { at: 10, title: "Kædesmører", text: "Ti træninger. Maskineriet kører." },
  { at: 25, title: "Skifteområdets stamgæst", text: "Du kender vejen fra våddragt til cykelsko i blinde." },
  { at: 50, title: "Mælkesyremester", text: "Halvtreds træninger. Benene protesterer, du gør det alligevel." },
  { at: 75, title: "Brick-bølle", text: "Cykel og løb i samme hug er bare tirsdag for dig." },
  { at: 100, title: "Jernambassadør", text: "Hundrede træninger. Du ER klubben." },
  { at: 150, title: "Asfaltaristokrat", text: "Vejen kender dit navn." },
  { at: 200, title: "Triatlonlegende", text: "Der bliver fortalt historier om dig i omklædningsrummet." },
  { at: 300, title: "Klubbens inventar", text: "Vi overvejer at skrive dig ind i vedtægterne." },
] as const;

export type Level = (typeof LEVELS)[number];

/** Engelske titler, slået op på antal træninger */
export const LEVELS_EN: Record<number, { title: string; text: string }> = {
  1: { title: "Wetsuit rookie", text: "First training done. Welcome to the pack!" },
  5: { title: "Pool pirate", text: "You've found your way to the club five times. It's a habit now." },
  10: { title: "Chain greaser", text: "Ten trainings. The machine is running." },
  25: { title: "Transition regular", text: "You know the way from wetsuit to bike shoes blindfolded." },
  50: { title: "Lactic acid master", text: "Fifty trainings. Your legs protest, you do it anyway." },
  75: { title: "Brick bully", text: "Bike and run in one go is just Tuesday for you." },
  100: { title: "Iron ambassador", text: "A hundred trainings. You ARE the club." },
  150: { title: "Asphalt aristocrat", text: "The road knows your name." },
  200: { title: "Triathlon legend", text: "They tell stories about you in the changing room." },
  300: { title: "Club furniture", text: "We're considering writing you into the bylaws." },
};
export const levelText = (l: Level, loc: Locale) => (loc === "en" ? LEVELS_EN[l.at] : l);

export type Rank = { count: number; level: Level | null; next: Level | null; toNext: number; pct: number };

export function rank(count: number): Rank {
  let i = -1;
  LEVELS.forEach((l, j) => { if (count >= l.at) i = j; });
  const level = i >= 0 ? LEVELS[i] : null;
  const next = LEVELS[i + 1] ?? null;
  const from = level?.at ?? 0;
  return { count, level, next, toNext: next ? next.at - count : 0, pct: next ? Math.round(((count - from) / (next.at - from)) * 100) : 100 };
}

export type Trophy = { key: string; title: string; text: string; earned: boolean; progress: string };

const WEEK = 7 * 864e5;
/** Ugenummer siden 1970, hvor ugen starter mandag (1. januar 1970 var en torsdag). */
const weekNo = (d: Date) => Math.floor((d.getTime() + 3 * 864e5) / WEEK);
const hourDk = (d: Date) => Number(new Intl.DateTimeFormat("da-DK", { hour: "numeric", hour12: false, timeZone: "Europe/Copenhagen" }).format(d));
const monthDk = (d: Date) => Number(new Intl.DateTimeFormat("da-DK", { month: "numeric", timeZone: "Europe/Copenhagen" }).format(d));

/** Længste række af uger i træk med mindst én træning. */
export function longestStreak(done: Done[]): number {
  const weeks = [...new Set(done.map((d) => weekNo(d.at)))].sort((a, b) => a - b);
  let best = 0, run = 0, prev = NaN;
  for (const w of weeks) { run = w === prev + 1 ? run + 1 : 1; best = Math.max(best, run); prev = w; }
  return best;
}

export function trophies(done: Done[], loc: Locale = "da"): Trophy[] {
  const en = loc === "en";
  const by = (d: Discipline) => done.filter((x) => x.discipline === d).length;
  const swim = by("SWIM"), bike = by("BIKE"), run = by("RUN");
  const early = done.filter((d) => hourDk(d.at) < 7).length;
  const winter = done.filter((d) => [12, 1, 2].includes(monthDk(d.at))).length;
  const hosted = done.filter((d) => d.host).length;
  const streak = longestStreak(done);
  const weeks = new Map<number, Set<Discipline>>();
  for (const d of done) weeks.set(weekNo(d.at), (weeks.get(weekNo(d.at)) ?? new Set()).add(d.discipline));
  const triWeek = [...weeks.values()].some((s) => s.has("SWIM") && s.has("BIKE") && s.has("RUN"));
  const t = (key: string, title: string, text: string, have: number, need: number, unit: string): Trophy => ({
    key, title, text, earned: have >= need, progress: `${Math.min(have, need)} ${en ? "of" : "af"} ${need} ${unit}`,
  });
  return [
    en ? t("klor", "Chlorine head", "10 swim trainings", swim, 10, "swims") : t("klor", "Klorhoved", "10 svømmetræninger", swim, 10, "svøm"),
    en ? t("hjul", "Wheel sucker", "10 bike trainings", bike, 10, "rides") : t("hjul", "Hjulsuger", "10 cykeltræninger", bike, 10, "cykel"),
    en ? t("asfalt", "Asphalt eater", "10 run trainings", run, 10, "runs") : t("asfalt", "Asfaltæder", "10 løbetræninger", run, 10, "løb"),
    en
      ? { key: "tri", title: "Triathlete on paper", text: "Swim, bike and run in the same week", earned: triWeek, progress: triWeek ? "Done" : "Needs a week with all three" }
      : { key: "tri", title: "Triatlet på papiret", text: "Svøm, cykel og løb i samme uge", earned: triWeek, progress: triWeek ? "Klaret" : "Mangler en uge med alle tre" },
    en ? t("streak", "Unstoppable", "Training 6 weeks in a row", streak, 6, "weeks") : t("streak", "Ustoppelig", "Træning 6 uger i træk", streak, 6, "uger"),
    en ? t("morgen", "Early bird", "5 trainings before 7 am", early, 5, "mornings") : t("morgen", "Morgenfrisk", "5 træninger før kl. 7", early, 5, "morgener"),
    en ? t("vinter", "Winter bather", "10 trainings in December, January or February", winter, 10, "winter trainings") : t("vinter", "Vinterbader", "10 træninger i december, januar eller februar", winter, 10, "vintertræninger"),
    en ? t("vaert", "Session leader", "Host 3 sessions in Train together", hosted, 3, "sessions") : t("vaert", "Turleder", "Stå for 3 ture under Træn sammen", hosted, 3, "ture"),
  ];
}
