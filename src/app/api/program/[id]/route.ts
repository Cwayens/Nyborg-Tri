import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { FROM_WEARABLE } from "@/lib/benchmarks";
import { slugify } from "@/lib/athletes";
import { workoutToFit, workoutToZwo } from "@/lib/fit";
import { KIND_LABEL, isWorkout, personalTarget, referencesFrom } from "@/lib/workout";

// Træningsprogram som fil til uret (.fit) eller Zwift (.zwo), med medlemmets egne watt og tempi.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Log ind for at hente programmet", { status: 401 });
  const t = await prisma.trainingSession.findUnique({ where: { id: (await params).id } });
  if (!t || !isWorkout(t.workout)) return new Response("Træningen har intet program", { status: 404 });

  const refs = referencesFrom(
    await prisma.benchmarkResult.findMany({ where: { userId: session.user.id, ...FROM_WEARABLE }, select: { test: true, seconds: true, watts: true } }),
  );
  const day = t.startsAt.toLocaleDateString("da-DK", { day: "numeric", month: "numeric", timeZone: "Europe/Copenhagen" });
  const name = `${t.title.slice(0, 24)} ${day}`;
  const file = `${slugify(t.title)}-${t.startsAt.toISOString().slice(0, 10)}`;
  const format = new URL(req.url).searchParams.get("format");

  if (format === "zwo") {
    if (t.discipline === "SWIM") return new Response("Svømning kan ikke hentes som .zwo", { status: 400 });
    return new Response(workoutToZwo(t.workout, name, t.discipline), {
      headers: { "Content-Type": "application/xml; charset=utf-8", "Content-Disposition": `attachment; filename="${file}.zwo"` },
    });
  }
  // Trinnets navn på uret: personligt mål (fx "263 W"), ellers typen (fx "Pause")
  const bytes = workoutToFit(t.workout, t.discipline, refs, name, new Date(), (s) => personalTarget(t.discipline, s, refs) ?? KIND_LABEL[s.kind]);
  return new Response(Buffer.from(bytes), {
    headers: { "Content-Type": "application/vnd.ant.fit", "Content-Disposition": `attachment; filename="${file}.fit"`, "Cache-Control": "private, no-store" },
  });
}
