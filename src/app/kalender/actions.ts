"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canSignUp } from "@/lib/access";
import { prisma } from "@/lib/db";

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
    const training = await prisma.trainingSession.findUnique({ where: { id: sessionId }, select: { startsAt: true } });
    if (!training || training.startsAt < new Date()) return;
    await prisma.trainingSignup.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      update: {},
      create: { sessionId, userId },
    });
  }
  revalidatePath("/kalender");
}
