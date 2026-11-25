import { test } from "node:test";
import assert from "node:assert/strict";
import { parseKr, oreToInput, summarize, toCsv } from "./finance";

test("beløb: danske og internationale skrivemåder", () => {
  assert.equal(parseKr("1.234,50"), 123450);
  assert.equal(parseKr("1234,5"), 123450);
  assert.equal(parseKr("1234.50"), 123450);
  assert.equal(parseKr("12.000"), 1200000);
  assert.equal(parseKr("450 kr."), 45000);
  assert.equal(parseKr("-100"), null);
  assert.equal(parseKr("abc"), null);
  assert.equal(parseKr(""), null);
  assert.equal(oreToInput(123450), "1234,50");
  assert.equal(oreToInput(45000), "450");
});

test("overblik: kontingent fra kort + posteringer, budget og resultat", () => {
  const s = summarize(
    [
      { kind: "INCOME", category: "SPONSOR", amountOre: 500000 },
      { kind: "INCOME", category: "KONTINGENT", amountOre: 30000 },
      { kind: "EXPENSE", category: "BANELEJE", amountOre: 200000 },
      { kind: "EXPENSE", category: "FINDES_IKKE", amountOre: 1000 },
    ],
    1000000,
    { KONTINGENT: 1200000, BANELEJE: 250000 },
  );
  const row = (code: string) => [...s.income, ...s.expense].find((r) => r.category.code === code)!;
  assert.equal(row("KONTINGENT").actual, 1030000);
  assert.equal(row("KONTINGENT").budget, 1200000);
  assert.equal(row("SPONSOR").budget, null);
  assert.equal(row("ANDET_UD").actual, 1000);
  assert.equal(s.totalIncome, 1530000);
  assert.equal(s.totalExpense, 201000);
  assert.equal(s.result, 1329000);
  assert.equal(s.budgetExpense, 250000);
});

test("CSV: semikolon, minus på udgifter, ingen formler", () => {
  const csv = toCsv([
    { voucher: "1", date: "2026-03-01", text: "Baneleje; marts", category: "BANELEJE", kind: "EXPENSE", amountOre: 123450, source: "Manuel" },
    { voucher: "S-ab12", date: "2026-03-02", text: "=HYPERLINK(\"x\")", category: "KONTINGENT", kind: "INCOME", amountOre: 45000, source: "Kort" },
  ]);
  const lines = csv.replace("﻿", "").trim().split("\r\n");
  assert.equal(lines[0], "Bilag;Dato;Tekst;Konto;Kategori;Beløb;Modpart;Kilde;Bilag-link");
  assert.equal(lines[1], '1;2026-03-01;"Baneleje; marts";2010;Svømmehal og baneleje;-1234,50;;Manuel;');
  assert.ok(lines[2].includes(`"'=HYPERLINK(""x"")"`));
  assert.ok(lines[2].includes(";1010;Kontingent;450,00;"));
});
