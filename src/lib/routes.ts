import type { Discipline } from "@prisma/client";
import data from "@/data/ruter.json";
import { CLUB } from "@/lib/club";

// Klubbens ruter, hentet fra den gamle hjemmeside (TCX-, KML- og kortfiler) og forenklet til kortet.
export type Route = { id: string; name: string; sport: Discipline; tag: string; desc: string; km: number; pts: [number, number][]; gpx?: boolean };
export const ROUTES = data as Route[];

export function routeToGpx(r: Route): string {
  const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<gpx version="1.1" creator="${CLUB.name}" xmlns="http://www.topografix.com/GPX/1/1">`,
    `  <metadata><name>${esc(r.name)}</name></metadata>`,
    `  <trk><name>${esc(r.name)}</name><trkseg>`,
    ...r.pts.map(([lat, lng]) => `    <trkpt lat="${lat}" lon="${lng}"/>`),
    "  </trkseg></trk>",
    "</gpx>",
    "",
  ].join("\n");
}
