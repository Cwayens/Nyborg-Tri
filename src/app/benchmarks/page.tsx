import Link from "next/link";
import type { BenchmarkResult } from "@prisma/client";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { TESTS, TEST_BY_KEY, change, formatDetail, formatResult, isTest, matchTest, score, formatDuration } from "@/lib/benchmarks";
import { DisciplineIcon } from "@/components/Icons";
import { Sparkline } from "@/components/Sparkline";
import { dato } from "@/lib/format";
import { addBenchmark, addFromActivity, deleteBenchmark } from "./actions";

export const metadata = { title: "Mine tests" };

type Props = { searchParams: Promise<{ fejl?: string; gemt?: string; test?: string }> };

export default async function Benchmarks({ searchParams }: Props) {
  const user = await requireUser("/benchmarks");
  const sp = await searchParams;
  const [results, acts] = await Promise.all([
    prisma.benchmarkResult.findMany({ where: { userId: user.id }, orderBy: { date: "asc" } }),
    prisma.activity.findMany({
      where: { userId: user.id, sport: { in: ["RUN", "SWIM"] }, startAt: { gte: new Date(Date.now() - 180 * 864e5) } },
      orderBy: { startAt: "desc" },
      take: 200,
    }),
  ]);

  const byTest = new Map<string, BenchmarkResult[]>();
  for (const r of results) byTest.set(r.test, [...(byTest.get(r.test) ?? []), r]);

  // Aktiviteter på præcis en testdistance, som ikke allerede er gemt
  const saved = new Set(results.map((r) => `${r.date.getTime()}-${r.seconds}`));
  const suggestions = acts
    .map((a) => ({ a, test: matchTest(a) }))
    .filter((x) => x.test && !saved.has(`${x.a.startAt.getTime()}-${x.a.movingSec}`))
    .slice(0, 3);

  const today = new Date().toISOString().slice(0, 10);
  const preset = isTest(sp.test) ? sp.test : "RUN_5K";
  const savedDef = isTest(sp.gemt) ? TEST_BY_KEY[sp.gemt] : null;

  return (
    <>
      <h1>Mine tests</h1>
      <p className="muted" style={{ marginTop: -8 }}>Dine resultater i klubbens fem faste tests. Gentag dem et par gange om året, så kan du se din udvikling.</p>
      {sp.fejl && <p className="status-warn">{sp.fejl}</p>}
      {savedDef && <p className="notice">Resultatet for {savedDef.label.toLowerCase()} er gemt.</p>}

      <div className="bm-grid">
        {TESTS.map((def) => {
          const list = byTest.get(def.test) ?? [];
          const best = list.length ? list.reduce((a, b) => (score(b) > score(a) ? b : a)) : undefined;
          const latest = list[list.length - 1];
          const diff = change(list[list.length - 2], latest);
          return (
            <section key={def.test} className={`card bm-card disc disc-${def.discipline}`}>
              <header>
                <DisciplineIcon discipline={def.discipline} />
                <h2>{def.label}</h2>
              </header>
              {best ? (
                <>
                  <p className="bm-best">{formatResult(best)}<small>{def.kind === "watts" ? "FTP" : "bedste tid"}</small></p>
                  <p className="muted bm-detail">{[formatDetail(best), dato(best.date)].filter(Boolean).join(" · ")}</p>
                  <Sparkline values={list.map(score)} label={`Udvikling i ${def.label}`} />
                  <p className="bm-latest">
                    Seneste: <b>{formatResult(latest!)}</b> {dato(latest!.date)}
                    {diff && <span className={`pill ${diff.better ? "ok" : "warn"}`}>{diff.text}</span>}
                  </p>
                  <details className="bm-history">
                    <summary>Alle {list.length} resultater</summary>
                    <ul>
                      {[...list].reverse().map((r) => (
                        <li key={r.id}>
                          <span>{dato(r.date)}</span>
                          <b>{formatResult(r)}</b>
                          <span className="muted">{r.note ?? ""}</span>
                          <form action={deleteBenchmark}>
                            <input type="hidden" name="id" value={r.id} />
                            <button className="linklike" type="submit" aria-label={`Slet resultat fra ${dato(r.date)}`}>Slet</button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  </details>
                </>
              ) : (
                <p className="muted">Ingen resultat endnu. {def.help}</p>
              )}
              <Link href={`/benchmarks?test=${def.test}#ny`} className="button ghost small">+ Nyt resultat</Link>
            </section>
          );
        })}
      </div>

      {suggestions.length > 0 && (
        <section className="card" style={{ marginTop: 24 }}>
          <h2 className="h3">Fundet i dine aktiviteter</h2>
          <p className="muted" style={{ marginTop: 0 }}>Disse ture har præcis en testdistance. Var det en test, kan du gemme den med ét tryk.</p>
          {suggestions.map(({ a, test }) => (
            <div key={a.id} className="item">
              <div className="body">
                <div className="title">{a.name}</div>
                <div className="meta">{dato(a.startAt)} · {(a.distanceM / 1000).toLocaleString("da-DK")} km · {formatDuration(a.movingSec)}</div>
              </div>
              <form action={addFromActivity}>
                <input type="hidden" name="id" value={a.id} />
                <button className="button small secondary" type="submit">Gem som {TEST_BY_KEY[test!].short}</button>
              </form>
            </div>
          ))}
        </section>
      )}

      <section id="ny" className="card" style={{ marginTop: 24 }}>
        <h2 className="h3">Nyt resultat</h2>
        <form action={addBenchmark} className="stack" style={{ maxWidth: "100%" }}>
          <div className="row">
            <label>Test
              <select name="test" defaultValue={preset}>
                {TESTS.map((t) => <option key={t.test} value={t.test}>{t.label}</option>)}
              </select>
            </label>
            <label>Dato<input type="date" name="date" defaultValue={today} max={today} required /></label>
            <label>Resultat<input name="value" required placeholder="Tid mm:ss, eller watt for FTP" inputMode="decimal" /></label>
          </div>
          <label>Note (valgfri)<input name="note" maxLength={200} placeholder="fx 25 m bassin, blæst, løbebane" /></label>
          <button className="button" type="submit" style={{ justifySelf: "start" }}>Gem resultat</button>
        </form>
      </section>
    </>
  );
}
