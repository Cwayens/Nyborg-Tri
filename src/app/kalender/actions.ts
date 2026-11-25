"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canSignUp } from "@/lib/access";
import { prisma } from "@/lib/db";
import { calendarViewer, mayJoin } from "@/lib/visibility";

export async function toggleSignup(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/kalender");
  const userId = session.user.id;
  const sessionId = String(formData.get("sessionId"));

  const existing = await prisma.trainingSignup.findUnique({ where: { sessionId_userId: { sessionId, userId } } });
  if (existing) {
    await prisma.trainingSignup.delete({ where: { id: existing.id } });
  } else {
    // Tilmelding kræver betalt medlemskab, godkendt prøveperiode eller indløst kode
    if (!(await canSignUp(userId))) redirect("/bliv-medlem?fejl=" + encodeURIComponent("Du skal være medlem for at tilmelde dig træninger"));
    const training = await prisma.trainingSession.findUnique({ where: { id: sessionId }, select: { startsAt: true, teamId: true, cancelledAt: true, paceGroups: true } });
    if (!training || training.startsAt < new Date() || training.cancelledAt) return;
    // Atleter kan kun tilmelde sig træninger for deres eget hold, og kun dem de må se (rolle og gruppe slås op i databasen)
    const viewer = await calendarViewer(userId);
    if (!viewer || !(await mayJoin(viewer, training.teamId))) return;
    await prisma.trainingSignup.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      update: {},
      create: { sessionId, userId, paceGroup: pickPace(formData, training.paceGroups) },
    });
  }
  revalidatePath("/kalender");
  revalidatePath("/min-side");
}

const pickPace = (formData: FormData, groups: string[]) => {
  const v = String(formData.get("paceGroup") ?? "");
  return groups.includes(v) ? v : null;
};

/** Skift tempogruppe på en træning, man allerede er tilmeldt. */
export async function setPaceGroup(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/kalender");
  const sessionId = String(formData.get("sessionId"));
  const training = await prisma.trainingSession.findUnique({ where: { id: sessionId }, select: { paceGroups: true } });
  if (!training) return;
  await prisma.trainingSignup.updateMany({ where: { sessionId, userId: session.user.id }, data: { paceGroup: pickPace(formData, training.paceGroups) } });
  revalidatePath("/kalender");
}
