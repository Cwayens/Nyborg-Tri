export function kr(ore: number): string {
  return new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK", maximumFractionDigits: 0 }).format(ore / 100);
}

export function dato(d: Date | string): string {
  return new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Copenhagen" }).format(new Date(d));
}

export function isoDate(d: Date): string {
  // Dato i dansk tid, YYYY-MM-DD
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" }).format(d);
}
