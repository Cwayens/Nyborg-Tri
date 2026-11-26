import { isOn } from "@/lib/features";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { FROM_WEARABLE } from "@/lib/benchmarks";
import { slugify } from "@/lib/athletes";
import { workoutToFit, workoutToZwo } from "@/lib/fit";
import { KIND_LABEL, isWorkout, parseText, personalTarget, referencesFrom } from "@/lib/workout";
import { PLAN_SESSIONS } from "@/data/begynder";
import { teamsFor } from "@/lib/visibility";
import { getClub } from "@/lib/site";

// Træningsprogram som fil til uret (.fit) eller Zwift (.zwo), med medlemmets egne watt og tempi.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isOn("urfiler"))) return new Response("Ikke fundet", { status: 404 });
  const session = await auth();
  if (!session?.user) return new Response("Log ind for at hente programmet", { status: 401 });
  const id = (await params).id;
  const url = new URL(req.url);
  // Klubtræning eller en "Træn sammen"-tur, som et medlem har slået op
  const kilde = url.searchParams.get("kilde");
  const plan = kilde === "forloeb" ? PLAN_SESSIONS.find((s) => s.id === id) : null;
  const t = plan
    ? { title: `Begynder ${plan.id.replace("u", "uge ").replace("-", " pas ")}`, discipline: plan.discipline, startsAt: new Date(), workout: parseText(plan.program) as unknown }
    : kilde === "eget"
      ? await prisma.plannedWorkout.findFirst({ where: { id, userId: session.user.id } }).then((p) => p && { ...p, startsAt: new Date(`${p.day}T12:00:00Z`) })
      : kilde === "tur"
      ? ((await isOn("traensammen")) ? await prisma.groupWorkout.findUnique({ where: { id } }) : null)
      : await prisma.trainingSession.findFirst({ where: { id, teamId: { in: await teamsFor(session.user.id) } } });
  if (!t || !isWorkout(t.workout)) return new Response("Træningen har intet program", { status: 404 });

  const refs = referencesFrom(
    await prisma.benchmarkResult.findMany({ where: { userId: session.user.id, ...FROM_WEARABLE }, select: { test: true, seconds: true, watts: true } }),
  );
  const day = t.startsAt.toLocaleDateString("da-DK", { day: "numeric", month: "numeric", timeZone: "Europe/Copenhagen" });
  const name = `${t.title.slice(0, 24)} ${day}`;
  const file = `${slugify(t.title)}-${t.startsAt.toISOString().slice(0, 10)}`;
  const format = url.searchParams.get("format");

  if (format === "zwo") {
    if (t.discipline === "SWIM") return new Response("Svømning kan ikke hentes som .zwo", { status: 400 });
    return new Response(workoutToZwo(t.workout, name, t.discipline, (await getClub()).name), {
      headers: { "Content-Type": "application/xml; charset=utf-8", "Content-Disposition": `attachment; filename="${file}.zwo"` },
    });
  }
  // Trinnets navn på uret: personligt mål (fx "263 W"), ellers typen (fx "Pause")
  const bytes = workoutToFit(t.workout, t.discipline, refs, name, new Date(), (s) => personalTarget(t.discipline, s, refs) ?? KIND_LABEL[s.kind]);
  return new Response(Buffer.from(bytes), {
    headers: { "Content-Type": "application/vnd.ant.fit", "Content-Disposition": `attachment; filename="${file}.fit"`, "Cache-Control": "private, no-store" },
  });
}
