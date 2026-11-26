"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/db";
import { readMembers, type ImportRow } from "@/lib/member-import";
import { defaultGroupFor } from "@/lib/roles";
import { matchTeam } from "@/lib/teams";
import { getTeams } from "@/lib/visibility";
import { currentClubId } from "@/lib/tenant";

const key = (adminId: string) => `import_preview_${adminId}`;
const fail = (msg: string): never => redirect(`/admin/import?fejl=${encodeURIComponent(msg)}`);

/** Trin 1: læs filen og vis, hvad der vil blive importeret. Intet gemmes på medlemmerne endnu. */
export async function previewImport(fd: FormData) {
  const admin = await requireAdmin();
  const f = fd.get("file");
  if (!(f instanceof File) || f.size === 0) fail("Vælg en fil");
  const file = f as File;
  if (/\.xlsx?$/i.test(file.name)) fail("Gem filen som CSV i Excel først: Filer → Gem som → CSV (semikolonsepareret)");
  if (file.size > 2 * 1024 * 1024) fail("Filen er for stor (maks 2 MB)");
  const r = readMembers(await file.text());
  if (r.missing.length) fail(r.missing.join(". "));
  const v = { rows: r.rows, mapped: r.mapped, name: file.name } as unknown as Prisma.InputJsonValue;
  await prisma.setting.upsert({ where: { clubId_key: { clubId: await currentClubId(), key: key(admin.id) } }, update: { value: v }, create: { key: key(admin.id), value: v } });
  redirect("/admin/import?vis=1");
}

export async function cancelImport() {
  const admin = await requireAdmin();
  await prisma.setting.deleteMany({ where: { key: key(admin.id) } });
  redirect("/admin/import");
}

/** Trin 2: opret medlemmerne. Findes mailen allerede, springes rækken over, så intet overskrives. */
export async function runImport() {
  const admin = await requireAdmin();
  const saved = await prisma.setting.findFirst({ where: { key: key(admin.id) } });
  const rows = ((saved?.value as { rows?: ImportRow[] } | null)?.rows ?? []).filter((r) => r.errors.length === 0);
  if (!rows.length) fail("Der er ingen rækker at importere");
  const types = await prisma.membershipType.findMany();
  const teams = await getTeams();
  const findType = (t: string | null) => {
    if (!t) return null;
    const n = t.toLowerCase();
    return types.find((x) => x.name.toLowerCase() === n || x.code.toLowerCase() === n) ?? types.find((x) => x.name.toLowerCase().includes(n) || n.includes(x.name.toLowerCase())) ?? null;
  };
  const existing = new Set((await prisma.user.findMany({ where: { email: { in: rows.map((r) => r.email) } }, select: { email: true } })).map((u) => u.email.toLowerCase()));
  const now = new Date();
  let created = 0, skipped = 0, memberships = 0;
  for (const r of rows) {
    if (existing.has(r.email)) { skipped++; continue; }
    const type = findType(r.type);
    const until = r.paidUntil ? new Date(`${r.paidUntil}T23:59:59Z`) : null;
    await prisma.user.create({
      data: {
        name: r.name, email: r.email, phone: r.phone, birthDate: r.birthDate ? new Date(`${r.birthDate}T12:00:00Z`) : null,
        address: r.address, zip: r.zip, city: r.city, guardianName: r.guardianName, guardianEmail: r.guardianEmail,
        // Holdet findes på navn (fx "U17"), ellers på gruppe; databasen giver så det første hold af den type
        ...((r.groupText && matchTeam(r.groupText, teams)) ? { teamId: matchTeam(r.groupText!, teams)!.id } : { athleteGroup: r.group ?? (type ? defaultGroupFor(type.code) : null) }),
        ...(type && until && until > now ? { memberships: { create: { typeId: type.id, source: "MANUAL", startDate: now, endDate: until } } } : {}),
      },
    });
    created++;
    if (type && until && until > now) memberships++;
  }
  await prisma.setting.deleteMany({ where: { key: key(admin.id) } });
  revalidatePath("/admin");
  redirect(`/admin/import?oprettet=${created}&sprunget=${skipped}&medlemskaber=${memberships}`);
}
