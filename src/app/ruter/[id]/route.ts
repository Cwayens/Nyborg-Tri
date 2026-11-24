import { ROUTES, routeToGpx } from "@/lib/routes";

// /ruter/<id>.gpx – ruten som GPX-fil til uret, Komoot, Strava m.fl.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id.replace(/\.gpx$/, "");
  const r = ROUTES.find((x) => x.id === id);
  if (!r) return new Response("Ruten findes ikke", { status: 404 });
  return new Response(routeToGpx(r), {
    headers: { "Content-Type": "application/gpx+xml; charset=utf-8", "Content-Disposition": `attachment; filename="nyborgtri-${r.id}.gpx"` },
  });
}
