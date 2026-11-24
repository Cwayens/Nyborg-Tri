"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { disconnect, syncRecent } from "@/lib/wearables/strava";

export async function syncStrava() {
  const user = await requireUser("/forbindelser");
  let n = 0;
  try {
    n = await syncRecent(user.id);
  } catch {
    redirect("/forbindelser?fejl=" + encodeURIComponent("Kunne ikke hente fra Strava – prøv igen senere"));
  }
  redirect(`/forbindelser?hentet=${n}`);
}

export async function disconnectStrava() {
  const user = await requireUser("/forbindelser");
  await disconnect(user.id);
  revalidatePath("/forbindelser");
}

export async function setSharing(formData: FormData) {
  const user = await requireUser("/forbindelser");
  await prisma.user.update({ where: { id: user.id }, data: { shareActivities: formData.get("share") === "on" } });
  revalidatePath("/forbindelser");
  revalidatePath("/statistik");
}

export async function newCalendarLink() {
  const user = await requireUser("/forbindelser");
  await prisma.user.update({ where: { id: user.id }, data: { calendarToken: randomBytes(24).toString("base64url") } });
  revalidatePath("/forbindelser");
}
