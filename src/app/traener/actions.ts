"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canManageTeam, requireTeamStaff, type Staff } from "@/lib/staff";
import { prisma } from "@/lib/db";
import { addWeeksLocal, parseLocal } from "@/lib/time";
import { readProgram, workoutValue } from "@/lib/program-upload";
import { splitPaceGroups } from "@/lib/pace";

const schema = z.object({
  title: z.string().trim().min(2, "Skriv en titel"),
  discipline: z.enum(["SWIM", "BIKE", "RUN", "STRENGTH", "OTHER"]),
  location: z.string().trim().min(2, "Skriv et sted"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Vælg en dato"),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Vælg starttid"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Vælg sluttid"),
  description: z.string().trim().optional(),
  repeatWeeks: z.coerce.number().int().min(1).max(52).default(1),
  team: z.string().min(1, "Vælg hvilket hold træningen er for"),
  paceGroups: z.string().optional(),
  testDay: z.enum(["RUN_5K", "RUN_10K", "BIKE_FTP20", "SWIM_100", "SWIM_1500", ""]).optional(),
});


async function parse(formData: FormData, staff: Staff) {
  const r = schema.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")));
  if (!r.success) throw new Error(r.error.issues[0].message);
  if (r.data.end <= r.data.start) throw new Error("Sluttid skal være efter starttid");
  const team = await prisma.team.findFirst({ where: { id: r.data.team, active: true }, select: { id: true, kind: true } });
  if (!team) throw new Error("Vælg hvilket hold træningen er for");
  if (!canManageTeam(staff, team.id)) throw new Error("Du kan kun oprette træninger for dine egne hold");
  return { ...r.data, teamId: team.id, group: team.kind };
}

/** Træningen, hvis personen må rette den (trænere: alle, holdledere: egne hold). */
async function own(staff: Staff, id: string) {
  const t = await prisma.trainingSession.findUniqueOrThrow({ where: { id } });
  if (!canManageTeam(staff, t.teamId)) redirect("/traener");
  return t;
}

function fail(path: string, e: unknown): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}fejl=${encodeURIComponent(e instanceof Error ? e.message : String(e))}`);
}

export async function createTraining(formData: FormData) {
  const user = await requireTeamStaff();
  let d, workout;
  try {
    d = await parse(formData, user);
    workout = await readProgram(formData, user.id);
  } catch (e) {
    fail("/traener/ny", e);
  }
  const seriesId = d.repeatWeeks > 1 ? randomUUID() : null;
  await prisma.trainingSession.createMany({
    data: Array.from({ length: d.repeatWeeks }, (_, i) => ({
      title: d.title,
      discipline: d.discipline,
      location: d.location,
      description: d.description || null,
      group: d.group,
      teamId: d.teamId,
      startsAt: parseLocal(addWeeksLocal(`${d.date}T${d.start}`, i)),
      endsAt: parseLocal(addWeeksLocal(`${d.date}T${d.end}`, i)),
      seriesId,
      workout: workoutValue(workout),
      ...(formData.has("paceGroups") ? { paceGroups: splitPaceGroups(d.paceGroups) } : {}),
      ...(formData.has("testDay") ? { testDay: d.testDay || null } : {}),
      createdById: user.id,
    })),
  });
  revalidatePath("/kalender");
  redirect("/traener?gemt=1");
}

export async function updateTraining(id: string, formData: FormData) {
  const user = await requireTeamStaff();
  let d, workout;
  try {
    d = await parse(formData, user);
    workout = await readProgram(formData, user.id);
  } catch (e) {
    fail(`/traener/${id}`, e);
  }
  await own(user, id);
  await prisma.trainingSession.update({
    where: { id },
    data: {
      title: d.title, discipline: d.discipline, location: d.location, description: d.description || null, group: d.group, teamId: d.teamId,
      startsAt: parseLocal(`${d.date}T${d.start}`), endsAt: parseLocal(`${d.date}T${d.end}`),
      workout: workoutValue(workout),
      ...(formData.has("paceGroups") ? { paceGroups: splitPaceGroups(d.paceGroups) } : {}),
      ...(formData.has("testDay") ? { testDay: d.testDay || null } : {}),
    },
  });
  revalidatePath("/kalender");
  redirect("/traener?gemt=1");
}

export async function deleteTraining(id: string, formData: FormData) {
  const user = await requireTeamStaff();
  const t = await own(user, id);
  if (formData.get("scope") === "series" && t.seriesId) {
    // Holdledere sletter kun træninger for deres egne hold i serien
    await prisma.trainingSession.deleteMany({ where: { seriesId: t.seriesId, startsAt: { gte: t.startsAt }, ...(user.role === "ATHLETE" ? { teamId: { in: user.leads } } : {}) } });
  } else {
    await prisma.trainingSession.delete({ where: { id } });
  }
  revalidatePath("/kalender");
  redirect("/traener?slettet=1");
}

export async function cancelTraining(id: string, formData: FormData) {
  const user = await requireTeamStaff();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200) || null;
  const t = await own(user, id);
  await prisma.trainingSession.update({ where: { id }, data: { cancelledAt: t.cancelledAt ? null : new Date(), cancelReason: t.cancelledAt ? null : reason } });
  revalidatePath("/kalender");
  revalidatePath("/min-side");
  redirect(`/traener/${id}`);
}
