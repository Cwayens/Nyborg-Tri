"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";

// Deltagelse er frivillig (samtykke). Køn og fødselsdato bruges til Ironman-aldersgrupperne.
export async function joinLeaderboard(formData: FormData) {
  const user = await requireUser("/leaderboard");
  const gender = formData.get("gender");
  const birth = String(formData.get("birthDate") ?? "");
  const back = String(formData.get("back") ?? "/leaderboard");
  const fail = (m: string) => redirect(`/leaderboard?fejl=${encodeURIComponent(m)}`);
  if (gender !== "MALE" && gender !== "FEMALE") fail("Vælg køn, så du kommer i den rigtige klasse");
  const current = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { birthDate: true } });
  let birthDate = current.birthDate;
  if (birth) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) fail("Skriv din fødselsdato");
    birthDate = new Date(birth);
  }
  if (!birthDate) fail("Skriv din fødselsdato, så du kommer i den rigtige aldersgruppe");
  await prisma.user.update({ where: { id: user.id }, data: { gender: gender as "MALE" | "FEMALE", birthDate, leaderboard: true } });
  revalidatePath("/leaderboard");
  redirect(back.startsWith("/leaderboard") ? back : "/leaderboard");
}

export async function leaveLeaderboard() {
  const user = await requireUser("/leaderboard");
  await prisma.user.update({ where: { id: user.id }, data: { leaderboard: false } });
  revalidatePath("/leaderboard");
  redirect("/leaderboard");
}
