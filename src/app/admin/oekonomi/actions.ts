"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTreasurer } from "@/lib/staff";
import { readImage, storeFile } from "@/lib/upload";
import { CATEGORY, isCategory, parseKr } from "@/lib/finance";
import { sendMail } from "@/lib/mail";
import { baseUrl } from "@/lib/url";
import { CLUB } from "@/lib/club";
import { dato, kr } from "@/lib/format";

const CB = "/admin/oekonomi";
const fail = (path: string, msg: string): never => {
  const [p, hash] = path.split("#");
  return redirect(`${p}${p.includes("?") ? "&" : "?"}fejl=${encodeURIComponent(msg)}${hash ? `#${hash}` : ""}`);
};

/** Bilag: billede (skaleres ned) eller PDF, højst 4 MB. */
async function receipt(fd: FormData, back: string): Promise<string | null | undefined> {
  if (fd.get("fjernBilag") === "on") return null;
  const f = fd.get("bilag");
  if (!(f instanceof File) || f.size === 0) return undefined; // uændret
  if (f.type === "application/pdf") {
    if (f.size > 4 * 1024 * 1024) fail(back, "PDF-bilaget må højst fylde 4 MB");
    const buf = Buffer.from(await f.arrayBuffer());
    if (buf.subarray(0, 5).toString() !== "%PDF-") fail(back, "Filen er ikke en PDF");
    return storeFile(`bilag/${randomUUID()}.pdf`, buf, "application/pdf");
  }
  const r = await readImage(f, { folder: "bilag", maxWidth: 2000 });
  if (!r.ok) fail(back, r.error.replace("Billedet skal være", "Bilaget skal være PDF,"));
  return r.ok ? r.url : undefined;
}

/** Opret eller ret en postering. */
export async function saveEntry(fd: FormData) {
  const me = await requireTreasurer(CB);
  const id = String(fd.get("id") ?? "");
  const year = String(fd.get("date") ?? "").slice(0, 4);
  const back = `${CB}/posteringer?aar=${year || new Date().getFullYear()}${id ? `&ret=${id}` : ""}#ny`;
  const kind = fd.get("kind") === "EXPENSE" ? "EXPENSE" : "INCOME";
  const category = String(fd.get(kind === "INCOME" ? "categoryIncome" : "categoryExpense") ?? "");
  const date = String(fd.get("date") ?? "");
  const text = String(fd.get("text") ?? "").trim().slice(0, 200);
  const amountOre = parseKr(String(fd.get("amount") ?? ""));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(back, "Vælg en dato");
  if (!isCategory(category, kind)) fail(back, "Vælg en kategori");
  if (!amountOre || amountOre <= 0 || amountOre > 100_000_000_00) fail(back, "Skriv et beløb, fx 1.250,00");
  if (!text) fail(back, "Skriv en tekst, fx hvad det var");
  const sponsorId = category === "SPONSOR" ? String(fd.get("sponsorId") ?? "") || null : null;
  if (sponsorId && !(await prisma.sponsor.findUnique({ where: { id: sponsorId }, select: { id: true } }))) fail(back, "Sponsoren findes ikke");
  const file = await receipt(fd, back);
  const data = {
    date: new Date(`${date}T00:00:00Z`), kind, category, amountOre: amountOre!, text,
    counterparty: String(fd.get("counterparty") ?? "").trim().slice(0, 120) || null, sponsorId,
    ...(file !== undefined ? { receipt: file } : {}),
  } as const;
  if (id) await prisma.ledgerEntry.update({ where: { id }, data });
  else await prisma.ledgerEntry.create({ data: { ...data, createdById: me.id } });
  revalidatePath(CB, "layout");
  redirect(`${CB}/posteringer?aar=${date.slice(0, 4)}&gemt=1`);
}

export async function deleteEntry(fd: FormData) {
  await requireTreasurer(CB);
  const e = await prisma.ledgerEntry.delete({ where: { id: String(fd.get("id")) } }).catch(() => null);
  revalidatePath(CB, "layout");
  redirect(`${CB}/posteringer?aar=${e ? e.date.getUTCFullYear() : new Date().getFullYear()}&slettet=1`);
}

/** Gem budgettet for et år. Tomme felter fjerner budgettet for kategorien. */
export async function saveBudget(fd: FormData) {
  await requireTreasurer(CB);
  const year = Number(fd.get("year"));
  if (!(year >= 2000 && year <= 2100)) fail(`${CB}/budget`, "Ugyldigt år");
  for (const code of Object.keys(CATEGORY)) {
    const raw = String(fd.get(`b_${code}`) ?? "").trim();
    if (!raw) {
      await prisma.budgetLine.deleteMany({ where: { year, category: code } });
      continue;
    }
    const ore = raw === "0" ? 0 : parseKr(raw);
    if (ore === null) fail(`${CB}/budget?aar=${year}`, `Beløbet for ${CATEGORY[code].label} ser forkert ud`);
    await prisma.budgetLine.upsert({ where: { year_category: { year, category: code } }, update: { amountOre: ore! }, create: { year, category: code, amountOre: ore! } });
  }
  revalidatePath(CB, "layout");
  redirect(`${CB}/budget?aar=${year}&gemt=1`);
}

/** Kopiér sidste års budget som udgangspunkt. */
export async function copyBudget(fd: FormData) {
  await requireTreasurer(CB);
  const year = Number(fd.get("year"));
  const last = await prisma.budgetLine.findMany({ where: { year: year - 1 } });
  for (const b of last) {
    await prisma.budgetLine.upsert({ where: { year_category: { year, category: b.category } }, update: {}, create: { year, category: b.category, amountOre: b.amountOre } });
  }
  revalidatePath(CB, "layout");
  redirect(`${CB}/budget?aar=${year}${last.length ? "&kopieret=1" : "&fejl=" + encodeURIComponent(`Der er intet budget for ${year - 1}`)}`);
}

/** Send en venlig påmindelse om at forny (til forælder, hvis medlemmet er under 18 og har en værge). */
export async function sendReminder(fd: FormData) {
  await requireTreasurer(CB);
  const u = await prisma.user.findUnique({
    where: { id: String(fd.get("userId")) },
    select: { name: true, email: true, guardianEmail: true, memberships: { orderBy: { endDate: "desc" }, take: 1, select: { endDate: true, type: { select: { priceOre: true, name: true } } } } },
  });
  if (!u) redirect(`${CB}/restancer`);
  const m = u.memberships[0];
  const to = u.guardianEmail ?? u.email;
  const url = `${await baseUrl()}/bliv-medlem`;
  const ok = await sendMail(
    to,
    `Forny dit medlemskab af ${CLUB.shortName}`,
    `Hej ${u.name ?? ""}\n\n${m ? `Medlemskabet (${m.type.name}) udløb ${dato(m.endDate)}. ` : ""}Vi håber, du vil træne med igen!\n\n` +
      `Du kan forny her${m ? ` (${kr(m.type.priceOre)} for et år)` : ""}: ${url}\n\nHar du spørgsmål, eller vil du melde dig ud, så svar bare på denne mail.\n\nVenlig hilsen\nKassereren, ${CLUB.name}`,
  );
  redirect(`${CB}/restancer?${ok ? "sendt" : "ikkesendt"}=${encodeURIComponent(u.name ?? to)}`);
}
