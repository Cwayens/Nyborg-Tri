// Økonomi for en forening: kategorier med kontonumre, budget mod faktisk og eksport til bogføring.
// Rene funktioner uden database, så de kan testes. Databasen bruges i src/lib/finance-db.ts.

export type Kind = "INCOME" | "EXPENSE";
export type Category = { code: string; label: string; kind: Kind; account: number; hint?: string };

/** Enkel kontoplan. Kontonumrene står i eksporten, så de kan mappes til klubbens bogføringsprogram. */
export const FINANCE_CATEGORIES: Category[] = [
  { code: "KONTINGENT", label: "Kontingent", kind: "INCOME", account: 1010, hint: "Kortbetalinger kommer automatisk med. Skriv kun kontant eller bankoverførsel her." },
  { code: "SPONSOR", label: "Sponsorater", kind: "INCOME", account: 1020 },
  { code: "TILSKUD", label: "Tilskud og fonde", kind: "INCOME", account: 1030, hint: "Fx kommunens aktivitetstilskud, DIF/DGI-puljer og fonde" },
  { code: "STAEVNE_IND", label: "Stævner og arrangementer", kind: "INCOME", account: 1040, hint: "Startgebyrer fra klubbens eget stævne, billetter m.m." },
  { code: "SALG", label: "Salg af klubtøj og udstyr", kind: "INCOME", account: 1050 },
  { code: "ANDET_IND", label: "Andre indtægter", kind: "INCOME", account: 1090 },
  { code: "BANELEJE", label: "Svømmehal og baneleje", kind: "EXPENSE", account: 2010 },
  { code: "TRAENER", label: "Trænere og kurser", kind: "EXPENSE", account: 2020 },
  { code: "FORBUND", label: "Forbund og forsikring", kind: "EXPENSE", account: 2030, hint: "Fx DTriF, DGI og klubforsikring" },
  { code: "STAEVNE_UD", label: "Stævner og startgebyrer", kind: "EXPENSE", account: 2040 },
  { code: "UDSTYR", label: "Udstyr og klubtøj", kind: "EXPENSE", account: 2050 },
  { code: "ARRANGEMENT", label: "Sociale arrangementer", kind: "EXPENSE", account: 2060 },
  { code: "ADMIN", label: "Administration, IT og gebyrer", kind: "EXPENSE", account: 2070, hint: "Fx hjemmeside, Stripe-gebyrer og bankgebyrer" },
  { code: "ANDET_UD", label: "Andre udgifter", kind: "EXPENSE", account: 2090 },
];
export const CATEGORY = Object.fromEntries(FINANCE_CATEGORIES.map((c) => [c.code, c])) as Record<string, Category>;
export const categoriesOf = (kind: Kind) => FINANCE_CATEGORIES.filter((c) => c.kind === kind);
export const isCategory = (code: unknown, kind?: Kind): code is string =>
  typeof code === "string" && !!CATEGORY[code] && (!kind || CATEGORY[code].kind === kind);

/** "1.234,50", "1234.5", "1 234 kr" → øre. null, hvis det ikke er et beløb. */
export function parseKr(input: string): number | null {
  let s = input.trim().replace(/\s|kr\.?|dkk/gi, "");
  if (!s) return null;
  // Dansk: punktum som tusindtalsseparator og komma som decimaltegn. Kun punktum: decimaltegn, hvis der er 1-2 decimaler.
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

/** Øre som "1234,50" (til felter og CSV, uden tusindtalsseparator). */
export const oreToInput = (ore: number) => (ore / 100).toFixed(2).replace(".", ",").replace(/,00$/, "");

export type Entry = { kind: Kind; category: string; amountOre: number };
export type Row = { category: Category; actual: number; budget: number | null };
export type Summary = { income: Row[]; expense: Row[]; totalIncome: number; totalExpense: number; result: number; budgetIncome: number; budgetExpense: number };

/**
 * Budget mod faktisk pr. kategori. Kontingent fra kortbetalinger lægges til kategorien KONTINGENT.
 * Ukendte kategorier (fx en, der er fjernet fra kontoplanen) lægges i "Andre indtægter/udgifter".
 */
export function summarize(entries: Entry[], membershipFeesOre: number, budget: Record<string, number>): Summary {
  const actual: Record<string, number> = { KONTINGENT: membershipFeesOre };
  for (const e of entries) {
    const code = isCategory(e.category, e.kind) ? e.category : e.kind === "INCOME" ? "ANDET_IND" : "ANDET_UD";
    actual[code] = (actual[code] ?? 0) + e.amountOre;
  }
  const rows = (kind: Kind) => categoriesOf(kind).map((c) => ({ category: c, actual: actual[c.code] ?? 0, budget: c.code in budget ? budget[c.code] : null }));
  const income = rows("INCOME"), expense = rows("EXPENSE");
  const sum = (r: Row[], f: (x: Row) => number) => r.reduce((t, x) => t + f(x), 0);
  const totalIncome = sum(income, (r) => r.actual), totalExpense = sum(expense, (r) => r.actual);
  return { income, expense, totalIncome, totalExpense, result: totalIncome - totalExpense, budgetIncome: sum(income, (r) => r.budget ?? 0), budgetExpense: sum(expense, (r) => r.budget ?? 0) };
}

export type ExportRow = { voucher: string; date: string; text: string; category: string; kind: Kind; amountOre: number; counterparty?: string | null; source: "Kort" | "Manuel"; receipt?: string | null };

const cell = (v: string) => {
  // Undgå formler i regneark (CSV-injektion) og citér felter med semikolon, anførselstegn eller linjeskift
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[;"\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** CSV til bogføringsprogrammer og Excel: semikolon, komma som decimaltegn, udgifter med minus. */
export function toCsv(rows: ExportRow[]): string {
  const head = ["Bilag", "Dato", "Tekst", "Konto", "Kategori", "Beløb", "Modpart", "Kilde", "Bilag-link"];
  const lines = rows.map((r) => {
    const c = CATEGORY[r.category];
    const amount = (r.kind === "EXPENSE" ? -r.amountOre : r.amountOre) / 100;
    const text = [r.voucher, r.date, r.text, c ? String(c.account) : "", c?.label ?? r.category].map(cell);
    const rest = [r.counterparty ?? "", r.source, r.receipt && /^https:\/\//.test(r.receipt) ? r.receipt : r.receipt ? "(gemt i systemet)" : ""].map(cell);
    return [...text, amount.toFixed(2).replace(".", ","), ...rest].join(";"); // beløbet er et tal, ikke tekst
  });
  return "﻿" + [head.join(";"), ...lines].join("\r\n") + "\r\n";
}
