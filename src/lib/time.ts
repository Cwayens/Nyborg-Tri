import { INTL, type Locale } from "./i18n-core";

// Træningstider indtastes og vises i dansk tid, uanset serverens tidszone.
const TZ = "Europe/Copenhagen";

function offsetMs(utc: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(utc)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - utc.getTime();
}

/** "2026-12-01T18:00" (dansk tid) → Date */
export function parseLocal(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) throw new Error(`Ugyldig tid: ${value}`);
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const first = guess - offsetMs(new Date(guess));
  return new Date(guess - offsetMs(new Date(first)));
}

/** Date → "2026-12-01T18:00" i dansk tid (til <input type="datetime-local">) */
export function toLocalInput(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .format(d)
    .replace(" ", "T");
}

/** Samme klokkeslæt i dansk tid, n uger senere (tager højde for sommertid). */
export function addWeeksLocal(value: string, weeks: number): string {
  const [date, time] = value.split("T");
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 7 * weeks);
  return `${d.toISOString().slice(0, 10)}T${time}`;
}

export function formatTime(d: Date, loc: Locale = "da"): string {
  return new Intl.DateTimeFormat(INTL[loc], { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
}

export function formatDay(d: Date, loc: Locale = "da"): string {
  return new Intl.DateTimeFormat(INTL[loc], { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(d);
}

export function dayKey(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d);
}

export function weekdayShort(d: Date, loc: Locale = "da"): string {
  const s = new Intl.DateTimeFormat(INTL[loc], { weekday: "short", timeZone: TZ }).format(d).replace(".", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** ISO-ugenummer (uge 1 er ugen med årets første torsdag), som i danske kalendere. Tager "YYYY-MM-DD" eller en dato. */
export function isoWeek(d: string | Date): number {
  const [y, m, day] = typeof d === "string" ? d.slice(0, 10).split("-").map(Number) : [d.getFullYear(), d.getMonth() + 1, d.getDate()];
  const t = new Date(Date.UTC(y, m - 1, day));
  t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7)); // torsdag i samme uge
  return Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
}
