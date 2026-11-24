"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/db";
import { readImage } from "@/lib/upload";


const fail = (m: string) => redirect("/admin/sponsorer?fejl=" + encodeURIComponent(m));

function cleanUrl(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withProto);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Logoet skaleres ned og gemmes i billedlageret (se src/lib/upload.ts). */
async function readLogo(v: FormDataEntryValue | null): Promise<string | null> {
  const r = await readImage(v, { folder: "sponsorer", maxWidth: 600, allowSvg: true });
  if (!r.ok) fail(r.error);
  return r.ok ? r.url : null;
}

const extra = (f: FormData) => ({
  description: String(f.get("description") ?? "").trim().slice(0, 200) || null,
  discount: String(f.get("discount") ?? "").trim().slice(0, 80) || null,
  details: String(f.get("details") ?? "").trim().slice(0, 1000) || null,
});

function done() {
  revalidatePath("/");
  revalidatePath("/admin/sponsorer");
  redirect("/admin/sponsorer?gemt=1");
}

export async function addSponsor(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  if (!name) fail("Skriv sponsorens navn");
  const logo = await readLogo(formData.get("logo"));
  if (!logo) fail("Vælg et logo");
  const last = await prisma.sponsor.aggregate({ _max: { sortOrder: true } });
  await prisma.sponsor.create({ data: { name, url: cleanUrl(formData.get("url")), logo: logo!, ...extra(formData), sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  done();
}

export async function updateSponsor(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  if (!name) fail("Skriv sponsorens navn");
  const logo = await readLogo(formData.get("logo"));
  await prisma.sponsor.update({
    where: { id },
    data: { name, url: cleanUrl(formData.get("url")), ...extra(formData), active: formData.get("active") === "on", ...(logo ? { logo } : {}) },
  });
  done();
}

export async function moveSponsor(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const dir = formData.get("dir") === "op" ? -1 : 1;
  const list = await prisma.sponsor.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } });
  const i = list.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i >= 0 && j >= 0 && j < list.length) {
    [list[i], list[j]] = [list[j], list[i]];
    await prisma.$transaction(list.map((s, k) => prisma.sponsor.update({ where: { id: s.id }, data: { sortOrder: k } })));
  }
  done();
}

export async function deleteSponsor(formData: FormData) {
  await requireAdmin();
  await prisma.sponsor.delete({ where: { id: String(formData.get("id")) } });
  done();
}
