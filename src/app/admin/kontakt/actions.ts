"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/db";
import { readImage } from "@/lib/upload";

const fail = (m: string) => redirect("/admin/kontakt?fejl=" + encodeURIComponent(m));

function done() {
  revalidatePath("/om/kontakt");
  revalidatePath("/admin/kontakt");
  redirect("/admin/kontakt?gemt=1");
}

async function fields(f: FormData) {
  const role = String(f.get("role") ?? "").trim().slice(0, 60);
  const name = String(f.get("name") ?? "").trim().slice(0, 100);
  if (!role || !name) fail("Skriv både rolle og navn");
  const photo = await readImage(f.get("photo"), 300, false);
  if (!photo.ok) fail(photo.error);
  return {
    role,
    name,
    phone: String(f.get("phone") ?? "").trim().slice(0, 30) || null,
    email: String(f.get("email") ?? "").trim().slice(0, 200) || null,
    ...(photo.ok && photo.dataUrl ? { photo: photo.dataUrl } : {}),
  };
}

export async function addContact(formData: FormData) {
  await requireAdmin();
  const last = await prisma.contactPerson.aggregate({ _max: { sortOrder: true } });
  await prisma.contactPerson.create({ data: { ...(await fields(formData)), sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  done();
}

export async function updateContact(formData: FormData) {
  await requireAdmin();
  const data = await fields(formData);
  await prisma.contactPerson.update({
    where: { id: String(formData.get("id")) },
    data: { ...data, ...(formData.get("removePhoto") === "on" ? { photo: null } : {}) },
  });
  done();
}

export async function moveContact(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const dir = formData.get("dir") === "op" ? -1 : 1;
  const list = await prisma.contactPerson.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } });
  const i = list.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i >= 0 && j >= 0 && j < list.length) {
    [list[i], list[j]] = [list[j], list[i]];
    await prisma.$transaction(list.map((s, k) => prisma.contactPerson.update({ where: { id: s.id }, data: { sortOrder: k } })));
  }
  done();
}

export async function deleteContact(formData: FormData) {
  await requireAdmin();
  await prisma.contactPerson.delete({ where: { id: String(formData.get("id")) } });
  done();
}

export async function toggleHandled(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const m = await prisma.contactMessage.findUnique({ where: { id }, select: { handledAt: true } });
  if (m) await prisma.contactMessage.update({ where: { id }, data: { handledAt: m.handledAt ? null : new Date() } });
  revalidatePath("/admin/kontakt");
  redirect("/admin/kontakt#henvendelser");
}
