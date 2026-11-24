import Link from "next/link";
import type { AthleteGroup } from "@prisma/client";
import { requireTrainer } from "@/auth";
import { prisma } from "@/lib/db";
import { TESTS, formatResult, score } from "@/lib/benchmarks";
import { GROUPS, GROUP_LABEL } from "@/lib/roles";
import { dato } from "@/lib/format";

export const metadata = { title: "Testresultater" };

// Trænerens overblik over gruppens bedste testresultater, fx til at lave baner og tempohold
export default async function TrainerTests({ searchParams }: { searchParams: Promise<{ gruppe?: string }> }) {
  await requireTrainer();
  const sp = await searchParams;
  const group: AthleteGroup = GROUPS.includes(sp.gruppe as AthleteGroup) ? (sp.gruppe as AthleteGroup) : "BREDDE";

  const athletes = await prisma.user.findMany({
    where: { athleteGroup: group },
    select: { id: true, name: true, benchmarks: { select: { test: true, seconds: true, watts: true, date: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <h1>Testresultater</h1>
      <p className="muted" style={{ marginTop: -8 }}>Bedste resultat pr. atlet. Brug det til baneinddeling og tempohold.</p>
      <nav className="filters" aria-label="Gruppe">
        {GROUPS.map((g) => (
          <Link key={g} href={`/traener/tests?gruppe=${g}`} className={g === group ? "active" : undefined} aria-current={g === group ? "page" : undefined}>
            {GROUP_LABEL[g]}
          </Link>
        ))}
      </nav>
      <div className="table-scroll">
        <table className="list">
          <thead>
            <tr><th>Atlet</th>{TESTS.map((t) => <th key={t.test}>{t.short}</th>)}<th>Seneste test</th></tr>
          </thead>
          <tbody>
            {athletes.map((a) => {
              const last = a.benchmarks.reduce<Date | null>((m, b) => (!m || b.date > m ? b.date : m), null);
              return (
                <tr key={a.id}>
                  <td>{a.name ?? "Uden navn"}</td>
                  {TESTS.map((t) => {
                    const list = a.benchmarks.filter((b) => b.test === t.test);
                    const best = list.length ? list.reduce((x, y) => (score(y) > score(x) ? y : x)) : null;
                    return <td key={t.test} style={{ fontVariantNumeric: "tabular-nums" }}>{best ? formatResult(best) : <span className="muted">–</span>}</td>;
                  })}
                  <td className="muted">{last ? dato(last) : "–"}</td>
                </tr>
              );
            })}
            {athletes.length === 0 && <tr><td colSpan={7} className="muted">Ingen atleter i gruppen endnu.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
