"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { parseLocal } from "@/lib/time";

const schema = z.object({
  sport: z.enum(["SWIM", "BIKE", "RUN", "STRENGTH", "OTHER"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Vælg dato"),
  time: z.string().regex(/^\d{2}:\d{2}$/).default("12:00"),
  minutes: z.coerce.number().int().min(1, "Skriv varighed").max(1440),
  distance: z.string().trim().optional(),
  name: z.string().trim().max(120).optional(),
});

export async function addActivity(formData: FormData) {
  const user = await requireUser("/aktiviteter");
  const r = schema.safeParse(Object.fromEntries(formData));
  if (!r.success) redirect("/aktiviteter?fejl=" + encodeURIComponent(r.error.issues[0].message));
  const d = r.data;
  const dist = Number((d.distance ?? "").replace(",", ".")) || 0;
  // Svømning skrives i meter, de andre i km
  const distanceM = Math.round(d.sport === "SWIM" ? dist : dist * 1000);
  const labels = { SWIM: "Svømning", BIKE: "Cykling", RUN: "Løb", STRENGTH: "Styrke", OTHER: "Træning" };
  await prisma.activity.create({
    data: {
      userId: user.id, provider: "MANUAL", sport: d.sport, name: d.name || labels[d.sport],
      startAt: parseLocal(`${d.date}T${d.time}`), movingSec: d.minutes * 60, distanceM,
    },
  });
  revalidatePath("/aktiviteter");
  redirect("/aktiviteter?gemt=1");
}

export async function deleteActivity(formData: FormData) {
  const user = await requireUser("/aktiviteter");
  await prisma.activity.deleteMany({ where: { id: String(formData.get("id")), userId: user.id, provider: "MANUAL" } });
  revalidatePath("/aktiviteter");
}
