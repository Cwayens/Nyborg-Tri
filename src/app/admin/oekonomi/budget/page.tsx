import { requireTreasurer } from "@/lib/staff";
import { AdminNav } from "@/components/AdminNav";
import { prisma } from "@/lib/db";
import { kr } from "@/lib/format";
import { categoriesOf, oreToInput, type Kind } from "@/lib/finance";
import { FinanceNav, YearPicker, yearParam } from "../FinanceNav";
import { copyBudget, saveBudget } from "../actions";

export const metadata = { title: "Admin – budget" };

export default async function Budget({ searchParams }: { searchParams: Promise<{ aar?: string; gemt?: string; kopieret?: string; fejl?: string }> }) {
  await requireTreasurer("/admin/oekonomi/budget");
  const sp = await searchParams;
  const year = yearParam(sp.aar);
  const [lines, lastCount] = await Promise.all([prisma.budgetLine.findMany({ where: { year } }), prisma.budgetLine.count({ where: { year: year - 1 } })]);
  const b = Object.fromEntries(lines.map((l) => [l.category, l.amountOre]));
  const total = (k: Kind) => categoriesOf(k).reduce((t, c) => t + (b[c.code] ?? 0), 0);
  return (
    <>
      <h1>Budget</h1>
      <AdminNav />
      <FinanceNav active="/budget" year={year} />
      <YearPicker year={year} path="/budget" />
      {sp.fejl && <p className="status-warn">{sp.fejl}</p>}
      {sp.gemt && <p className="notice">Budgettet er gemt.</p>}
      {sp.kopieret && <p className="notice">Sidste års budget er kopieret. Ret tallene til, og gem.</p>}
      <p className="muted" style={{ maxWidth: 720 }}>Skriv det forventede beløb for hele året. Overblikket viser så, hvordan året går i forhold til budgettet. Tomme felter tæller ikke med.</p>
      {lines.length === 0 && lastCount > 0 && (
        <form action={copyBudget} style={{ marginBottom: 14 }}>
          <input type="hidden" name="year" value={year} />
          <button className="button secondary small" type="submit">Start med budgettet fra {year - 1}</button>
        </form>
      )}
      <form action={saveBudget} className="grid two finance-budget">
        <input type="hidden" name="year" value={year} />
        {(["INCOME", "EXPENSE"] as const).map((k) => (
          <fieldset key={k} className="card stack">
            <legend className="h3">{k === "INCOME" ? "Indtægter" : "Udgifter"}</legend>
            {categoriesOf(k).map((c) => (
              <label key={c.code} className="budget-row">
                <span>{c.label}{c.hint && <small className="muted">{c.hint}</small>}</span>
                <input name={`b_${c.code}`} inputMode="decimal" defaultValue={c.code in b ? oreToInput(b[c.code]) : ""} placeholder="0" aria-label={`Budget for ${c.label} i kr.`} />
              </label>
            ))}
            <p style={{ margin: 0 }}><b>I alt {kr(total(k))}</b></p>
          </fieldset>
        ))}
        <div>
          <p>Budgetteret resultat: <b>{kr(total("INCOME") - total("EXPENSE"))}</b></p>
          <button className="button" type="submit">Gem budget for {year}</button>
        </div>
      </form>
    </>
  );
}
