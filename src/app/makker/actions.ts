"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Discipline } from "@prisma/client";
import { requireMember, requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { isChild } from "@/lib/guardian";
import { requireFeature } from "@/lib/features";
import { TIMES, parseMinSec } from "@/lib/buddy";

export async function saveBuddy(formData: FormData) {
  const user = await requireMember("/makker");
  await requireFeature("makker");
  const me = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { birthDate: true, athleteGroup: true } });
  if (isChild(me)) redirect("/makker");
  const disciplines = (["RUN", "BIKE", "SWIM"] as Discipline[]).filter((d) => formData.get(`d_${d}`) === "on");
  if (!disciplines.length) redirect("/makker?fejl=" + encodeURIComponent("Vælg mindst én sport"));
  const times = Object.keys(TIMES).filter((t) => formData.get(`t_${t}`) === "on");
  const bike = Number(String(formData.get("bikeSpeed") ?? "").replace(",", "."));
  const data = {
    disciplines,
    runPace: parseMinSec(String(formData.get("runPace") ?? "")),
    bikeSpeed: bike >= 10 && bike <= 50 ? Math.round(bike) : null,
    swimPace: parseMinSec(String(formData.get("swimPace") ?? "")),
    times,
    note: String(formData.get("note") ?? "").trim().slice(0, 200) || null,
  };
  await prisma.buddyProfile.upsert({ where: { userId: user.id }, update: data, create: { userId: user.id, ...data } });
  revalidatePath("/makker");
  redirect("/makker?gemt=1");
}

export async function removeBuddy() {
  const user = await requireUser("/makker");
  await prisma.buddyProfile.deleteMany({ where: { userId: user.id } });
  revalidatePath("/makker");
  redirect("/makker");
}
