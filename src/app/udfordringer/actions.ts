"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTrainer, requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { requireFeature } from "@/lib/features";
import { parseLocal } from "@/lib/time";

const schema = z.object({
  title: z.string().trim().min(3, "Skriv en titel").max(80),
  description: z.string().trim().max(500).optional(),
  discipline: z.enum(["SWIM", "BIKE", "RUN", ""]).optional(),
  metric: z.enum(["KM", "HOURS", "SESSIONS"]),
  goal: z.coerce.number().int().min(1, "Målet skal være mindst 1").max(1_000_000),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Vælg startdato"),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Vælg slutdato"),
});

export async function createChallenge(formData: FormData) {
  const user = await requireTrainer();
  await requireFeature("udfordringer");
  const r = schema.safeParse(Object.fromEntries(formData));
  if (!r.success) redirect("/udfordringer?ny=1&fejl=" + encodeURIComponent(r.error.issues[0].message));
  const d = r.data;
  const startsAt = parseLocal(`${d.start}T00:00`), endsAt = parseLocal(`${d.end}T23:59`);
  if (endsAt <= startsAt) redirect("/udfordringer?ny=1&fejl=" + encodeURIComponent("Slutdatoen skal være efter startdatoen"));
  await prisma.challenge.create({
    data: { title: d.title, description: d.description || null, discipline: d.discipline || null, metric: d.metric, goal: d.goal, startsAt, endsAt, createdById: user.id },
  });
  revalidatePath("/udfordringer");
  redirect("/udfordringer");
}

export async function deleteChallenge(formData: FormData) {
  await requireTrainer();
  await prisma.challenge.deleteMany({ where: { id: String(formData.get("id")) } });
  revalidatePath("/udfordringer");
}

export async function toggleChallenge(formData: FormData) {
  const user = await requireUser("/udfordringer");
  await requireFeature("udfordringer");
  const challengeId = String(formData.get("id"));
  const existing = await prisma.challengeParticipant.findUnique({ where: { challengeId_userId: { challengeId, userId: user.id } } });
  if (existing) await prisma.challengeParticipant.delete({ where: { id: existing.id } });
  else if (await prisma.challenge.count({ where: { id: challengeId, endsAt: { gt: new Date() } } })) {
    await prisma.challengeParticipant.create({ data: { challengeId, userId: user.id } });
  }
  revalidatePath("/udfordringer");
  revalidatePath("/min-side");
}
