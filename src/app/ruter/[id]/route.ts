import { isOn } from "@/lib/features";
import { routeToGpx } from "@/lib/routes";
import { getRoutes } from "@/lib/site";
import { CLUB } from "@/lib/club";

// /ruter/<id>.gpx – ruten som GPX-fil til uret, Komoot, Strava m.fl.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isOn("ruter"))) return new Response("Ikke fundet", { status: 404 });
  const id = (await params).id.replace(/\.gpx$/, "");
  const r = (await getRoutes()).find((x) => x.id === id);
  if (!r) return new Response("Ruten findes ikke", { status: 404 });
  return new Response(routeToGpx(r), {
    headers: { "Content-Type": "application/gpx+xml; charset=utf-8", "Content-Disposition": `attachment; filename="${CLUB.shortName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${r.id}.gpx"` },
  });
}
