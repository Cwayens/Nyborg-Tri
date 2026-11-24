"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/athletes";
import { readImage } from "@/lib/upload";

const back = (q = "gemt=1") => redirect(`/admin/atleter?${q}`);
const text = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max) || null;

function refresh() {
  revalidatePath("/atleter", "layout");
  revalidatePath("/");
  revalidatePath("/admin/atleter");
}

export async function createProfile(formData: FormData) {
  await requireAdmin();
  const user = await prisma.user.findFirst({ where: { id: String(formData.get("userId")), athleteGroup: "ELITE" } });
  if (!user) back("fejl=" + encodeURIComponent("Vælg en atlet fra Elite"));
  let slug = slugify(user!.name ?? "atlet");
  if (await prisma.athleteProfile.findUnique({ where: { slug } })) slug = `${slug}-${user!.id.slice(-4)}`;
  const last = await prisma.athleteProfile.aggregate({ _max: { sortOrder: true } });
  await prisma.athleteProfile.upsert({
    where: { userId: user!.id },
    update: {},
    create: { userId: user!.id, slug, sortOrder: (last._max.sortOrder ?? 0) + 1 },
  });
  refresh();
  back();
}

export async function saveProfile(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const photo = await readImage(formData.get("photo"), 400);
  if (!photo.ok) back("fejl=" + encodeURIComponent(photo.error));
  const sponsorIds = formData.getAll("sponsor").map(String);
  await prisma.athleteProfile.update({
    where: { id },
    data: {
      headline: text(formData.get("headline"), 120),
      bio: text(formData.get("bio"), 3000),
      goals: text(formData.get("goals"), 1000),
      results: text(formData.get("results"), 2000),
      instagram: text(formData.get("instagram"), 100),
      published: formData.get("published") === "on",
      featured: formData.get("featured") === "on",
      sortOrder: Number(formData.get("sortOrder")) || 0,
      sponsors: { set: sponsorIds.map((sid) => ({ id: sid })) },
      ...(photo.ok && photo.dataUrl ? { photo: photo.dataUrl } : {}),
      ...(formData.get("removePhoto") === "on" ? { photo: null } : {}),
    },
  });
  refresh();
  back();
}

export async function deleteProfile(formData: FormData) {
  await requireAdmin();
  await prisma.athleteProfile.delete({ where: { id: String(formData.get("id")) } });
  refresh();
  back();
}
