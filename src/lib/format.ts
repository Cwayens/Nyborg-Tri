import { INTL, type Locale } from "./i18n-core";

export function kr(ore: number, loc: Locale = "da"): string {
  return new Intl.NumberFormat(INTL[loc], { style: "currency", currency: "DKK", maximumFractionDigits: 0 }).format(ore / 100);
}

/** Beløb med øre, fx "1.234,50 kr." (regnskab). */
export function krOre(ore: number, loc: Locale = "da"): string {
  return new Intl.NumberFormat(INTL[loc], { style: "currency", currency: "DKK", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(ore / 100);
}

export function dato(d: Date | string, loc: Locale = "da"): string {
  return new Intl.DateTimeFormat(INTL[loc], { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Copenhagen" }).format(new Date(d));
}

export function isoDate(d: Date): string {
  // Dato i dansk tid, YYYY-MM-DD
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" }).format(d);
}
