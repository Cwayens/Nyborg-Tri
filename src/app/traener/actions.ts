"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTrainer } from "@/auth";
import { prisma } from "@/lib/db";
import { addWeeksLocal, parseLocal } from "@/lib/time";

const schema = z.object({
  title: z.string().trim().min(2, "Skriv en titel"),
  discipline: z.enum(["SWIM", "BIKE", "RUN", "STRENGTH", "OTHER"]),
  location: z.string().trim().min(2, "Skriv et sted"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Vælg en dato"),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Vælg starttid"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Vælg sluttid"),
  description: z.string().trim().optional(),
  repeatWeeks: z.coerce.number().int().min(1).max(52).default(1),
});

function parse(formData: FormData) {
  const r = schema.safeParse(Object.fromEntries(formData));
  if (!r.success) throw new Error(r.error.issues[0].message);
  if (r.data.end <= r.data.start) throw new Error("Sluttid skal være efter starttid");
  const groups = formData.getAll("groups").map(String).filter((g): g is "ELITE" | "BREDDE" | "BOERN" => ["ELITE", "BREDDE", "BOERN"].includes(g));
  return { ...r.data, groups };
}

function fail(path: string, e: unknown): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}fejl=${encodeURIComponent(e instanceof Error ? e.message : String(e))}`);
}

export async function createTraining(formData: FormData) {
  const user = await requireTrainer();
  let d;
  try {
    d = parse(formData);
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
      groups: d.groups,
      startsAt: parseLocal(addWeeksLocal(`${d.date}T${d.start}`, i)),
      endsAt: parseLocal(addWeeksLocal(`${d.date}T${d.end}`, i)),
      seriesId,
      createdById: user.id,
    })),
  });
  revalidatePath("/kalender");
  redirect("/traener?gemt=1");
}

export async function updateTraining(id: string, formData: FormData) {
  await requireTrainer();
  let d;
  try {
    d = parse(formData);
  } catch (e) {
    fail(`/traener/${id}`, e);
  }
  await prisma.trainingSession.update({
    where: { id },
    data: {
      title: d.title, discipline: d.discipline, location: d.location, description: d.description || null, groups: d.groups,
      startsAt: parseLocal(`${d.date}T${d.start}`), endsAt: parseLocal(`${d.date}T${d.end}`),
    },
  });
  revalidatePath("/kalender");
  redirect("/traener?gemt=1");
}

export async function deleteTraining(id: string, formData: FormData) {
  await requireTrainer();
  const t = await prisma.trainingSession.findUniqueOrThrow({ where: { id } });
  if (formData.get("scope") === "series" && t.seriesId) {
    await prisma.trainingSession.deleteMany({ where: { seriesId: t.seriesId, startsAt: { gte: t.startsAt } } });
  } else {
    await prisma.trainingSession.delete({ where: { id } });
  }
  revalidatePath("/kalender");
  redirect("/traener?slettet=1");
}
