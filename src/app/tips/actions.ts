"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTrainer } from "@/auth";
import { prisma } from "@/lib/db";
import { requireFeature } from "@/lib/features";
import { videoEmbed } from "@/lib/video";

const schema = z.object({
  title: z.string().trim().min(3, "Skriv en overskrift").max(100),
  body: z.string().trim().min(10, "Skriv selve tippet").max(3000),
  discipline: z.enum(["SWIM", "BIKE", "RUN", "STRENGTH", "OTHER", ""]).optional(),
  videoUrl: z.string().trim().max(300).optional(),
});

export async function createTip(formData: FormData) {
  const user = await requireTrainer();
  await requireFeature("tips");
  const r = schema.safeParse(Object.fromEntries(formData));
  if (!r.success) redirect("/tips?ny=1&fejl=" + encodeURIComponent(r.error.issues[0].message));
  const d = r.data;
  if (d.videoUrl && !videoEmbed(d.videoUrl)) redirect("/tips?ny=1&fejl=" + encodeURIComponent("Videoen skal være et link til YouTube eller Vimeo"));
  await prisma.tip.create({ data: { title: d.title, body: d.body, discipline: d.discipline || null, videoUrl: d.videoUrl || null, authorId: user.id } });
  revalidatePath("/tips");
  revalidatePath("/min-side");
  redirect("/tips?gemt=1");
}

export async function deleteTip(formData: FormData) {
  await requireTrainer();
  await prisma.tip.deleteMany({ where: { id: String(formData.get("id")) } });
  revalidatePath("/tips");
}
