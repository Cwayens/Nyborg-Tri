import type { Discipline } from "@prisma/client";
import data from "@/data/ruter.json";

// Klubbens ruter, hentet fra den gamle hjemmeside (TCX-, KML- og kortfiler) og forenklet til kortet.
export type Route = { id: string; name: string; sport: Discipline; tag: string; desc: string; km: number; pts: [number, number][]; gpx?: boolean };
export const ROUTES = data as Route[];

export function routeToGpx(r: Route, author: string): string {
  const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<gpx version="1.1" creator="${author.replace(/[<>&"]/g, "")}" xmlns="http://www.topografix.com/GPX/1/1">`,
    `  <metadata><name>${esc(r.name)}</name></metadata>`,
    `  <trk><name>${esc(r.name)}</name><trkseg>`,
    ...r.pts.map(([lat, lng]) => `    <trkpt lat="${lat}" lon="${lng}"/>`),
    "  </trkseg></trk>",
    "</gpx>",
    "",
  ].join("\n");
}

// ---------- Ruter fra GPX-filer (Admin → Klubben → Ruter) ----------

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;
function dist([a1, o1]: [number, number], [a2, o2]: [number, number]): number {
  const h = Math.sin(rad(a2 - a1) / 2) ** 2 + Math.cos(rad(a1)) * Math.cos(rad(a2)) * Math.sin(rad(o2 - o1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rutens længde i km. */
export function lengthKm(pts: [number, number][]): number {
  let km = 0;
  for (let i = 1; i < pts.length; i++) km += dist(pts[i - 1], pts[i]);
  return Math.round(km * 10) / 10;
}

/** Højst max punkter, jævnt fordelt, med første og sidste punkt bevaret. */
export function thin(pts: [number, number][], max = 400): [number, number][] {
  if (pts.length <= max) return pts;
  const step = (pts.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => pts[Math.round(i * step)]);
}

/** Punkter og navn fra en GPX-fil (spor eller rute). */
export function parseGpx(text: string): { name: string | null; pts: [number, number][] } {
  if (!/<gpx[\s>]/i.test(text)) throw new Error("Filen er ikke en GPX-fil");
  const pts: [number, number][] = [];
  const re = /<(?:trkpt|rtept)\b([^>]*)>/gi;
  for (let m; (m = re.exec(text)); ) {
    const lat = /\blat\s*=\s*"([-\d.]+)"/.exec(m[1]), lon = /\blon\s*=\s*"([-\d.]+)"/.exec(m[1]);
    if (lat && lon) pts.push([Math.round(+lat[1] * 1e5) / 1e5, Math.round(+lon[1] * 1e5) / 1e5]);
  }
  if (pts.length < 2) throw new Error("GPX-filen indeholder ingen rute");
  const name = /<(?:trk|rte)>[\s\S]*?<name>([^<]{1,80})<\/name>/i.exec(text)?.[1]?.trim() ?? /<metadata>[\s\S]*?<name>([^<]{1,80})<\/name>/i.exec(text)?.[1]?.trim() ?? null;
  return { name, pts: thin(pts) };
}
