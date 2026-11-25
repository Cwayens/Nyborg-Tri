"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireMember, requireUser } from "@/auth";
import { isChild } from "@/lib/guardian";
import { prisma } from "@/lib/db";
import { requireFeature } from "@/lib/features";
import { assignMentor } from "@/lib/mentor";

const CHILD_MSG = "Mentorordningen er for voksne medlemmer. Spørg din træner, hvis du gerne vil have en at træne med.";

async function childAccount(userId: string) {
  return isChild(await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { birthDate: true, athleteGroup: true } }));
}

export async function setMentor(formData: FormData) {
  const user = await requireMember("/mentor");
  await requireFeature("mentor");
  if (await childAccount(user.id)) redirect("/mentor?fejl=" + encodeURIComponent(CHILD_MSG));
  await prisma.user.update({ where: { id: user.id }, data: { mentor: formData.get("mentor") === "1" } });
  revalidatePath("/mentor");
}

/** Bed om en mentor. Se assignMentor i lib/mentor.ts. */
export async function requestMentor(formData: FormData) {
  const user = await requireMember("/mentor");
  await requireFeature("mentor");
  const r = await assignMentor(user.id, String(formData.get("note") ?? ""));
  // Børn kobles ikke 1:1 med en voksen, de ikke kender (assignMentor afviser dem også)
  if (!r.ok && r.reason === "barn") redirect("/mentor?fejl=" + encodeURIComponent(CHILD_MSG));
  if (!r.ok && r.reason === "ingen") redirect("/mentor?fejl=" + encodeURIComponent("Der er ingen ledige mentorer lige nu. Prøv igen senere, eller skriv i chatten."));
  revalidatePath("/mentor");
  redirect(r.ok ? "/mentor?ny=1" : "/mentor");
}

/** Admin: find en mentor til et medlem, der venter. */
export async function assignWaiting(formData: FormData) {
  await requireAdmin();
  await requireFeature("mentor");
  const r = await assignMentor(String(formData.get("userId")));
  revalidatePath("/mentor");
  if (!r.ok && r.reason === "ingen") redirect("/mentor?fejl=" + encodeURIComponent("Ingen har meldt sig som mentor endnu."));
  redirect("/mentor");
}

/** Admin: fjern et medlem fra listen over dem, der venter på en mentor. */
export async function dismissWaiting(formData: FormData) {
  await requireAdmin();
  await prisma.user.update({ where: { id: String(formData.get("userId")) }, data: { wantsMentor: false } });
  revalidatePath("/mentor");
}

export async function endMentorship(formData: FormData) {
  const user = await requireUser("/mentor");
  await prisma.mentorship.deleteMany({ where: { id: String(formData.get("id")), OR: [{ menteeId: user.id }, { mentorId: user.id }] } });
  revalidatePath("/mentor");
}
