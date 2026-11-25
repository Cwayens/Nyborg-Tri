// Gentagne rækker i en formular: felter hedder "<prefix>.<nr>.<felt>". Tomme rækker og rækker med "slet" sorteres fra.

export function str(fd: FormData, name: string, max = 2000): string {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function rows<F extends string>(fd: FormData, prefix: string, fields: readonly F[], max = 2000): Record<F, string>[] {
  const nums = new Set<number>();
  for (const k of fd.keys()) {
    const m = new RegExp(`^${prefix.replace(/\./g, "\\.")}\\.(\\d+)\\.`).exec(k);
    if (m) nums.add(+m[1]);
  }
  return [...nums]
    .sort((a, b) => a - b)
    .filter((n) => fd.get(`${prefix}.${n}.slet`) !== "on")
    .map((n) => Object.fromEntries(fields.map((f) => [f, str(fd, `${prefix}.${n}.${f}`, max)])) as Record<F, string>)
    .filter((r) => fields.some((f) => r[f] !== ""));
}

/** Linjer fra et tekstfelt, én pr. linje. */
export const lines = (v: string) => v.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

/** "55.31176, 10.81017" eller et Google Maps-link med "@55.31,10.81" eller "?q=55.31,10.81". */
export function parseCoords(v: string): { lat: number; lng: number } | null {
  const m = /(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/.exec(v);
  if (!m) return null;
  const lat = +m[1], lng = +m[2];
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 } : null;
}

export const slug = (s: string) =>
  s.toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "x";
