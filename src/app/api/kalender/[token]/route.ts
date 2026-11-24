import { prisma } from "@/lib/db";
import { buildIcs, type IcsEvent } from "@/lib/ics";
import { DISCIPLINE_LABEL } from "@/lib/roles";

// Personligt kalender-abonnement: dine tilmeldte træninger, din gruppes træninger og Træn sammen-ture.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await prisma.user.findUnique({ where: { calendarToken: token.replace(/\.ics$/, "") } });
  if (!user) return new Response("Not found", { status: 404 });
  const from = new Date(Date.now() - 14 * 24 * 3600 * 1000);
  const base = process.env.AUTH_URL ?? "";

  const [trainings, workouts] = await Promise.all([
    prisma.trainingSession.findMany({
      where: { startsAt: { gte: from }, OR: [{ signups: { some: { userId: user.id } } }, ...(user.athleteGroup ? [{ group: user.athleteGroup }] : [])] },
      include: { signups: { where: { userId: user.id }, select: { id: true } } },
    }),
    prisma.groupWorkout.findMany({
      where: { startsAt: { gte: from }, OR: [{ hostId: user.id }, { participants: { some: { userId: user.id } } }] },
    }),
  ]);
  const events: IcsEvent[] = [
    ...trainings.map((t) => ({
      cancelled: !!t.cancelledAt,
      uid: `training-${t.id}`, start: t.startsAt, end: t.endsAt, location: t.location, url: `${base}/kalender`,
      title: `${t.signups.length ? "✓ " : ""}${DISCIPLINE_LABEL[t.discipline]}: ${t.title}`,
      description: t.description ?? undefined,
    })),
    ...workouts.map((w) => ({
      uid: `workout-${w.id}`, start: w.startsAt, end: new Date(w.startsAt.getTime() + w.durationMin * 60000), location: w.location,
      title: `Træn sammen – ${DISCIPLINE_LABEL[w.discipline]}: ${w.title}`, description: w.description ?? undefined, url: `${base}/traen-sammen`,
    })),
  ];
  return new Response(buildIcs("Nyborg Tri – min træning", events), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=900" },
  });
}
