import { prisma } from "./db";
import { isoDate } from "./format";
import { summarize, type ExportRow } from "./finance";

// Danske årsgrænser (regnskabsår = kalenderår)
export const yearRange = (year: number) => ({ gte: new Date(`${year}-01-01T00:00:00+01:00`), lt: new Date(`${year + 1}-01-01T00:00:00+01:00`) });
const dateRange = (year: number) => ({ gte: new Date(`${year}-01-01T00:00:00Z`), lt: new Date(`${year + 1}-01-01T00:00:00Z`) });

/** Kortbetalinger af kontingent i året (refunderede tæller ikke med). */
export async function membershipFees(year: number) {
  return prisma.payment.findMany({
    where: { status: "PAID", paidAt: yearRange(year) },
    select: { id: true, amountOre: true, paidAt: true, description: true, user: { select: { name: true, email: true } } },
    orderBy: { paidAt: "asc" },
  });
}

export async function yearOverview(year: number) {
  const [entries, fees, budget] = await Promise.all([
    prisma.ledgerEntry.findMany({ where: { date: dateRange(year) }, select: { kind: true, category: true, amountOre: true, date: true, sponsor: { select: { id: true, name: true } } } }),
    membershipFees(year),
    prisma.budgetLine.findMany({ where: { year } }),
  ]);
  const feesOre = fees.reduce((t, p) => t + p.amountOre, 0);
  const summary = summarize(entries, feesOre, Object.fromEntries(budget.map((b) => [b.category, b.amountOre])));
  // Sponsorindtægter pr. sponsor
  const bySponsor = new Map<string, { name: string; ore: number }>();
  for (const e of entries) {
    if (e.kind !== "INCOME" || e.category !== "SPONSOR") continue;
    const key = e.sponsor?.id ?? "-";
    const cur = bySponsor.get(key) ?? { name: e.sponsor?.name ?? "Uden sponsor valgt", ore: 0 };
    cur.ore += e.amountOre;
    bySponsor.set(key, cur);
  }
  // Pr. måned: indtægter og udgifter (kontingent fra kort efter betalingsdato)
  const months = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));
  for (const e of entries) months[e.date.getUTCMonth()][e.kind === "INCOME" ? "income" : "expense"] += e.amountOre;
  for (const p of fees) if (p.paidAt) months[Number(isoDate(p.paidAt).slice(5, 7)) - 1].income += p.amountOre;
  return { summary, feesOre, feeCount: fees.length, sponsors: [...bySponsor.values()].sort((a, b) => b.ore - a.ore), months };
}

/** Restancer: ubetalte betalinger og medlemmer, hvis adgang er udløbet inden for det seneste år uden fornyelse. */
export async function arrears() {
  const now = new Date();
  const [unpaid, lapsed] = await Promise.all([
    prisma.payment.findMany({
      where: { status: { in: ["PENDING", "FAILED"] }, createdAt: { lt: new Date(now.getTime() - 2 * 864e5) }, user: { deletedAt: null } },
      select: { id: true, amountOre: true, description: true, createdAt: true, status: true, payLinkSentTo: true, user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: {
        deletedAt: null,
        memberships: {
          some: { endDate: { lte: now, gte: new Date(now.getTime() - 365 * 864e5) }, type: { code: { not: "PASSIVE" } }, source: { not: "TRIAL" } },
          none: { endDate: { gt: now } },
        },
      },
      select: { id: true, name: true, email: true, guardianEmail: true, memberships: { orderBy: { endDate: "desc" }, take: 1, select: { endDate: true, type: { select: { name: true, priceOre: true } } } } },
    }),
  ]);
  // Medlemmer med en ubetalt betaling står kun én gang (under ubetalte)
  const unpaidUsers = new Set(unpaid.map((p) => p.user.id));
  return { unpaid, lapsed: lapsed.filter((u) => !unpaidUsers.has(u.id)).sort((a, b) => b.memberships[0].endDate.getTime() - a.memberships[0].endDate.getTime()) };
}

/** Alle posteringer i året til bogføring: manuelle posteringer og kortbetalinger af kontingent. */
export async function exportRows(year: number): Promise<ExportRow[]> {
  const [entries, fees] = await Promise.all([
    prisma.ledgerEntry.findMany({ where: { date: dateRange(year) }, orderBy: [{ date: "asc" }, { voucherNo: "asc" }], include: { sponsor: { select: { name: true } } } }),
    membershipFees(year),
  ]);
  const rows: ExportRow[] = [
    ...entries.map((e) => ({
      voucher: String(e.voucherNo), date: e.date.toISOString().slice(0, 10), text: e.text, category: e.category, kind: e.kind, amountOre: e.amountOre,
      counterparty: e.counterparty ?? e.sponsor?.name ?? null, source: "Manuel" as const, receipt: e.receipt,
    })),
    ...fees.map((p) => ({
      voucher: `S-${p.id.slice(-6)}`, date: isoDate(p.paidAt!), text: `${p.description} – ${p.user.name ?? p.user.email}`, category: "KONTINGENT", kind: "INCOME" as const,
      amountOre: p.amountOre, counterparty: "Stripe", source: "Kort" as const,
    })),
  ];
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Opretter en postering med næste bilagsnummer i klubben. Bilagsnumre er fortløbende pr. klub; opretter to personer
 * en postering samtidig, får den ene en dublet-fejl fra databasen og prøver igen med næste nummer.
 */
export async function createLedgerEntry(data: Omit<Parameters<typeof prisma.ledgerEntry.create>[0]["data"], "voucherNo">) {
  for (let attempt = 0; ; attempt++) {
    const max = await prisma.ledgerEntry.aggregate({ _max: { voucherNo: true } });
    try {
      return await prisma.ledgerEntry.create({ data: { ...data, voucherNo: (max._max.voucherNo ?? 0) + 1 } as Parameters<typeof prisma.ledgerEntry.create>[0]["data"] });
    } catch (e) {
      if (attempt < 4 && (e as { code?: string }).code === "P2002") continue;
      throw e;
    }
  }
}
