"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth";
import { canSignUp } from "@/lib/access";
import { prisma } from "@/lib/db";
import { parseLocal } from "@/lib/time";

const schema = z.object({
  discipline: z.enum(["SWIM", "BIKE", "RUN", "STRENGTH", "OTHER"]),
  title: z.string().trim().min(2, "Skriv hvad I skal"),
  location: z.string().trim().min(2, "Skriv mødested"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Vælg dato"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Vælg tidspunkt"),
  durationMin: z.coerce.number().int().min(10).max(600),
  level: z.string().trim().max(80).optional(),
  description: z.string().trim().max(1000).optional(),
  maxPeople: z.coerce.number().int().min(2).max(100).optional().or(z.literal("").transform(() => undefined)),
});

export async function createWorkout(formData: FormData) {
  const user = await requireUser("/traen-sammen");
  if (!(await canSignUp(user.id))) redirect("/bliv-medlem?fejl=" + encodeURIComponent("Kun medlemmer kan slå træningsture op"));
  const r = schema.safeParse(Object.fromEntries(formData));
  if (!r.success) redirect("/traen-sammen?ny=1&fejl=" + encodeURIComponent(r.error.issues[0].message));
  const d = r.data;
  const startsAt = parseLocal(`${d.date}T${d.time}`);
  if (startsAt < new Date()) redirect("/traen-sammen?ny=1&fejl=" + encodeURIComponent("Tidspunktet er allerede passeret"));
  await prisma.groupWorkout.create({
    data: {
      hostId: user.id, discipline: d.discipline, title: d.title, location: d.location, startsAt, durationMin: d.durationMin,
      level: d.level || null, description: d.description || null, maxPeople: d.maxPeople ?? null,
      participants: { create: { userId: user.id } },
    },
  });
  revalidatePath("/traen-sammen");
  redirect("/traen-sammen?oprettet=1");
}

export async function toggleJoin(formData: FormData) {
  const user = await requireUser("/traen-sammen");
  const workoutId = String(formData.get("id"));
  const w = await prisma.groupWorkout.findUnique({ where: { id: workoutId }, include: { _count: { select: { participants: true } } } });
  if (!w || w.startsAt < new Date()) return;
  const existing = await prisma.groupWorkoutParticipant.findUnique({ where: { workoutId_userId: { workoutId, userId: user.id } } });
  if (existing) {
    if (w.hostId !== user.id) await prisma.groupWorkoutParticipant.delete({ where: { id: existing.id } });
  } else {
    if (!(await canSignUp(user.id))) redirect("/bliv-medlem?fejl=" + encodeURIComponent("Du skal være medlem for at hoppe med"));
    if (w.maxPeople && w._count.participants >= w.maxPeople) return;
    await prisma.groupWorkoutParticipant.create({ data: { workoutId, userId: user.id } });
  }
  revalidatePath("/traen-sammen");
  revalidatePath("/min-side");
}

export async function cancelWorkout(formData: FormData) {
  const user = await requireUser("/traen-sammen");
  await prisma.groupWorkout.deleteMany({ where: { id: String(formData.get("id")), hostId: user.id } });
  revalidatePath("/traen-sammen");
}
