"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { requireFeature } from "@/lib/features";
import { parseLocal } from "@/lib/time";
import { PLAN_SESSIONS, RACE_CHECKLIST } from "@/data/begynder";

export async function startPlan(formData: FormData) {
  const user = await requireUser("/begynder");
  await requireFeature("begynder");
  const d = String(formData.get("start") ?? "");
  const startedAt = /^\d{4}-\d{2}-\d{2}$/.test(d) ? parseLocal(`${d}T00:00`) : new Date();
  await prisma.beginnerPlan.upsert({ where: { userId: user.id }, update: { startedAt, done: [] }, create: { userId: user.id, startedAt } });
  revalidatePath("/begynder");
  redirect("/begynder");
}

export async function stopPlan() {
  const user = await requireUser("/begynder");
  await prisma.beginnerPlan.deleteMany({ where: { userId: user.id } });
  revalidatePath("/begynder");
  redirect("/begynder");
}

/** Sæt eller fjern flueben ved et pas eller et punkt på tjeklisten. */
export async function toggleDone(formData: FormData) {
  const user = await requireUser("/begynder");
  const id = String(formData.get("id"));
  const field = formData.get("list") === "checklist" ? "checklist" : "done";
  const valid = field === "done" ? PLAN_SESSIONS.some((s) => s.id === id) : RACE_CHECKLIST.some((c) => c.id === id);
  const plan = await prisma.beginnerPlan.findUnique({ where: { userId: user.id } });
  if (!plan || !valid) return;
  const list = plan[field];
  await prisma.beginnerPlan.update({ where: { userId: user.id }, data: { [field]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] } });
  revalidatePath("/begynder");
}
