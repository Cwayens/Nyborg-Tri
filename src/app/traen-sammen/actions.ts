"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth";
import { canSignUp } from "@/lib/access";
import { prisma } from "@/lib/db";
import { parseLocal } from "@/lib/time";
import { readProgram, workoutValue } from "@/lib/program-upload";
import { isWorkout, totalDuration, type Workout } from "@/lib/workout";

const schema = z.object({
  discipline: z.enum(["SWIM", "BIKE", "RUN", "STRENGTH", "OTHER"]),
  title: z.string().trim().max(80).optional(),
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
  const plannedId = String(formData.get("plannedId") ?? "").replace(/[^a-z0-9]/gi, "");
  const back = `/traen-sammen?ny=1${plannedId ? `&fra=${plannedId}` : ""}&fejl=`;
  const r = schema.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")));
  if (!r.success) redirect(back + encodeURIComponent(r.error.issues[0].message));
  const d = r.data;
  // Delt fra eget program: programmet følger med fra den planlagte træning
  const planned = plannedId ? await prisma.plannedWorkout.findFirst({ where: { id: plannedId, userId: user.id, sharedId: null } }) : null;
  let workout: Workout | undefined;
  try {
    workout = planned && isWorkout(planned.workout) ? planned.workout : await readProgram(formData, user.id);
  } catch (e) {
    redirect(back + encodeURIComponent(e instanceof Error ? e.message : "Programmet kunne ikke læses"));
  }
  // Titel, sport og varighed kan komme fra programmet (fx en TrainingPeaks-fil)
  const title = d.title || workout?.name?.trim() || "";
  if (title.length < 2) redirect(back + encodeURIComponent("Skriv hvad I skal"));
  const discipline = workout?.sport ?? d.discipline;
  const programMin = workout ? Math.round((totalDuration(workout) ?? 0) / 60) : 0;
  const durationMin = formData.get("durationAuto") === "1" && programMin >= 10 ? Math.min(programMin, 600) : d.durationMin;
  const startsAt = parseLocal(`${d.date}T${d.time}`);
  if (startsAt < new Date()) redirect(back + encodeURIComponent("Tidspunktet er allerede passeret"));
  const created = await prisma.groupWorkout.create({
    data: {
      hostId: user.id, discipline, title, location: d.location, startsAt, durationMin, workout: workoutValue(workout),
      level: d.level || null, description: d.description || null, maxPeople: d.maxPeople ?? null,
      participants: { create: { userId: user.id } },
    },
  });
  if (planned) await prisma.plannedWorkout.update({ where: { id: planned.id }, data: { sharedId: created.id } });
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
