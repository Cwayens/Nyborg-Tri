import Link from "next/link";
import { requireTreasurer } from "@/lib/staff";
import { kr } from "@/lib/format";
import { yearOverview, arrears } from "@/lib/finance-db";
import type { Row } from "@/lib/finance";
import { FinanceNav, YearPicker, yearParam } from "./FinanceNav";

export const metadata = { title: "Admin – økonomi" };

const MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export default async function Finance({ searchParams }: { searchParams: Promise<{ aar?: string }> }) {
  await requireTreasurer("/admin/oekonomi");
  const year = yearParam((await searchParams).aar);
  const [{ summary: s, feeCount, sponsors, months }, due] = await Promise.all([yearOverview(year), arrears()]);
  const dueOre = due.unpaid.reduce((t, p) => t + p.amountOre, 0);
  const hasBudget = s.budgetIncome > 0 || s.budgetExpense > 0;
  const thisYear = year === new Date().getFullYear();
  const shown = thisYear ? new Date().getMonth() + 1 : 12;
  return (
    <>
      <h1>Økonomi</h1>
      <FinanceNav active="" year={year} />
      <YearPicker year={year} path="" />

      <div className="stats" style={{ marginBottom: 20 }}>
        <div className="stat"><div className="value">{kr(s.totalIncome)}</div><div className="label">Indtægter {year}{hasBudget && ` · budget ${kr(s.budgetIncome)}`}</div></div>
        <div className="stat"><div className="value">{kr(s.totalExpense)}</div><div className="label">Udgifter {year}{hasBudget && ` · budget ${kr(s.budgetExpense)}`}</div></div>
        <div className="stat"><div className={`value ${s.result < 0 ? "neg" : ""}`}>{kr(s.result)}</div><div className="label">Resultat{hasBudget && ` · budget ${kr(s.budgetIncome - s.budgetExpense)}`}</div></div>
        <Link href="/admin/oekonomi/restancer" className="stat" style={{ color: "inherit", textDecoration: "none" }}>
          <div className="value">{due.unpaid.length + due.lapsed.length}</div>
          <div className="label">Restancer · {due.unpaid.length} ubetalte ({kr(dueOre)}), {due.lapsed.length} ikke fornyet</div>
        </Link>
      </div>

      <div className="grid two finance-tables">
        <Table title="Indtægter" rows={s.income} total={s.totalIncome} budget={s.budgetIncome} hasBudget={hasBudget} kind="INCOME" note={`Kontingent inkl. ${feeCount} kortbetalinger`} />
        <Table title="Udgifter" rows={s.expense} total={s.totalExpense} budget={s.budgetExpense} hasBudget={hasBudget} kind="EXPENSE" />
      </div>
      {!hasBudget && <p className="muted">Der er intet budget for {year}. <Link href={`/admin/oekonomi/budget?aar=${year}`}>Læg et budget</Link>, så kan du følge med i, hvordan året går.</p>}

      <div className="grid two" style={{ marginTop: 20 }}>
        <section className="card">
          <h2 className="h3" style={{ marginTop: 0 }}>Måned for måned</h2>
          <div className="table-scroll">
            <table className="list num">
              <thead><tr><th>Måned</th><th>Indtægter</th><th>Udgifter</th><th>Resultat</th></tr></thead>
              <tbody>
                {months.slice(0, shown).map((m, i) => (
                  <tr key={i}><td>{MONTHS[i]}</td><td>{kr(m.income)}</td><td>{kr(m.expense)}</td><td className={m.income - m.expense < 0 ? "neg" : undefined}>{kr(m.income - m.expense)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card">
          <h2 className="h3" style={{ marginTop: 0 }}>Sponsorindtægter {year}</h2>
          {sponsors.length === 0 ? (
            <p className="muted">Ingen endnu. Skriv en sponsorindbetaling under <Link href={`/admin/oekonomi/posteringer?aar=${year}`}>Posteringer</Link> med kategorien Sponsorater, og vælg sponsoren.</p>
          ) : (
            <table className="list num">
              <tbody>{sponsors.map((x) => <tr key={x.name}><td>{x.name}</td><td>{kr(x.ore)}</td></tr>)}</tbody>
              <tfoot><tr><th>I alt</th><th>{kr(sponsors.reduce((t, x) => t + x.ore, 0))}</th></tr></tfoot>
            </table>
          )}
        </section>
      </div>
    </>
  );
}

function Table({ title, rows, total, budget, hasBudget, kind, note }: { title: string; rows: Row[]; total: number; budget: number; hasBudget: boolean; kind: "INCOME" | "EXPENSE"; note?: string }) {
  // Afvigelse: positiv er godt (mere ind eller mindre ud end budgetteret)
  const diff = (r: { actual: number; budget: number | null }) => (r.budget === null ? null : kind === "INCOME" ? r.actual - r.budget : r.budget - r.actual);
  return (
    <section className="card">
      <h2 className="h3" style={{ marginTop: 0 }}>{title}</h2>
      <div className="table-scroll">
        <table className="list num">
          <thead><tr><th>Kategori</th><th>Faktisk</th>{hasBudget && <><th>Budget</th><th>Afvigelse</th></>}</tr></thead>
          <tbody>
            {rows.filter((r) => r.actual || r.budget).map((r) => {
              const d = diff(r);
              return (
                <tr key={r.category.code}>
                  <td>{r.category.label}{r.category.code === "KONTINGENT" && note && <small className="muted"> · {note}</small>}</td>
                  <td>{kr(r.actual)}</td>
                  {hasBudget && <><td>{r.budget === null ? "–" : kr(r.budget)}</td><td className={d !== null && d < 0 ? "neg" : undefined}>{d === null ? "–" : kr(d)}</td></>}
                </tr>
              );
            })}
            {rows.every((r) => !r.actual && !r.budget) && <tr><td colSpan={hasBudget ? 4 : 2} className="muted">Intet endnu</td></tr>}
          </tbody>
          <tfoot><tr><th>I alt</th><th>{kr(total)}</th>{hasBudget && <><th>{kr(budget)}</th><th className={(kind === "INCOME" ? total - budget : budget - total) < 0 ? "neg" : undefined}>{kr(kind === "INCOME" ? total - budget : budget - total)}</th></>}</tr></tfoot>
        </table>
      </div>
    </section>
  );
}
