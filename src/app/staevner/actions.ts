"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMember, requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { requireFeature } from "@/lib/features";
import { hasRole } from "@/lib/roles";
import { parseLocal } from "@/lib/time";

const raceSchema = z.object({
  name: z.string().trim().min(3, "Skriv stævnets navn").max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Vælg dato"),
  location: z.string().trim().min(2, "Skriv hvor").max(100),
  url: z.string().trim().url("Linket ser forkert ud").max(300).optional().or(z.literal("")),
  distances: z.string().trim().max(100).optional(),
});

export async function createRace(formData: FormData) {
  const user = await requireMember("/staevner");
  await requireFeature("staevner");
  const r = raceSchema.safeParse(Object.fromEntries(formData));
  if (!r.success) redirect("/staevner?ny=1&fejl=" + encodeURIComponent(r.error.issues[0].message));
  const d = r.data;
  const race = await prisma.race.create({
    data: { name: d.name, date: parseLocal(`${d.date}T09:00`), location: d.location, url: d.url || null, distances: d.distances || null, createdById: user.id },
  });
  revalidatePath("/staevner");
  redirect(`/staevner#${race.id}`);
}

export async function deleteRace(formData: FormData) {
  const user = await requireUser("/staevner");
  const id = String(formData.get("id"));
  await prisma.race.deleteMany({ where: { id, ...(hasRole(user.role, "TRAINER") ? {} : { createdById: user.id }) } });
  revalidatePath("/staevner");
}

export async function toggleTent(formData: FormData) {
  const user = await requireUser("/staevner");
  if (!hasRole(user.role, "TRAINER")) return;
  const race = await prisma.race.findUnique({ where: { id: String(formData.get("id")) } });
  if (race) await prisma.race.update({ where: { id: race.id }, data: { clubTent: !race.clubTent } });
  revalidatePath("/staevner");
}

const entrySchema = z.object({
  raceId: z.string().min(1),
  distance: z.string().trim().max(40).optional(),
  ride: z.enum(["NONE", "DRIVER", "PASSENGER"]).default("NONE"),
  seats: z.coerce.number().int().min(1).max(8).optional().or(z.literal("").transform(() => undefined)),
  rideFrom: z.string().trim().max(60).optional(),
});

export async function saveEntry(formData: FormData) {
  const user = await requireMember("/staevner");
  await requireFeature("staevner");
  const r = entrySchema.safeParse(Object.fromEntries(formData));
  if (!r.success) redirect("/staevner?fejl=" + encodeURIComponent(r.error.issues[0].message));
  const d = r.data;
  const data = {
    distance: d.distance || null, ride: d.ride,
    seats: d.ride === "DRIVER" ? d.seats ?? 1 : null,
    rideFrom: d.ride !== "NONE" ? d.rideFrom || null : null,
  };
  await prisma.raceEntry.upsert({ where: { raceId_userId: { raceId: d.raceId, userId: user.id } }, update: data, create: { raceId: d.raceId, userId: user.id, ...data } });
  revalidatePath("/staevner");
  redirect(`/staevner#${d.raceId}`);
}

export async function leaveRace(formData: FormData) {
  const user = await requireUser("/staevner");
  await prisma.raceEntry.deleteMany({ where: { raceId: String(formData.get("raceId")), userId: user.id } });
  revalidatePath("/staevner");
}
