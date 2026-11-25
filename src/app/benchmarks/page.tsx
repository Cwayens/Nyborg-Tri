import Link from "next/link";
import type { BenchmarkResult } from "@prisma/client";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { FROM_WEARABLE, TESTS, TEST_BY_KEY, change, formatDetail, formatResult, isTest, score } from "@/lib/benchmarks";
import { DisciplineIcon } from "@/components/Icons";
import { Sparkline } from "@/components/Sparkline";
import { dato } from "@/lib/format";
import { formatWkg, wattsPerKg } from "@/lib/efforts";
import { deleteBenchmark, saveEffort } from "./actions";
import { ProgressChart } from "@/components/ProgressChart";
import { isOn, requireFeature } from "@/lib/features";
import { formatDay, formatTime } from "@/lib/time";
import { groupsFor } from "@/lib/visibility";

export const metadata = { title: "Mine tests" };

type Props = { searchParams: Promise<{ fejl?: string; gemt?: string }> };

export default async function Benchmarks({ searchParams }: Props) {
  await requireFeature("tests");
  const user = await requireUser("/benchmarks");
  const sp = await searchParams;
  const tests = TESTS.map((t) => t.test);
  const [results, efforts, connected, pending, me] = await Promise.all([
    prisma.benchmarkResult.findMany({ where: { userId: user.id, ...FROM_WEARABLE }, orderBy: { date: "asc" } }),
    // Præstationer fra uret de sidste 180 dage, som ikke er gemt som test endnu
    prisma.effort.findMany({
      where: { userId: user.id, test: { in: tests }, result: null, date: { gte: new Date(Date.now() - 180 * 864e5) } },
      include: { activity: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.wearableConnection.count({ where: { userId: user.id } }),
    prisma.activity.count({ where: { userId: user.id, provider: { not: "MANUAL" }, effortsAt: null } }),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { weightKg: true } }),
  ]);

  const testdage = await isOn("testdage");
  const testDays = testdage
    ? await prisma.trainingSession.findMany({ where: { testDay: { not: null }, cancelledAt: null, group: { in: await groupsFor(user.id) } }, select: { id: true, testDay: true, startsAt: true, title: true, location: true }, orderBy: { startsAt: "asc" } })
    : [];
  const nextTest = testDays.find((d) => d.startsAt > new Date());
  const byTest = new Map<string, BenchmarkResult[]>();
  for (const r of results) byTest.set(r.test, [...(byTest.get(r.test) ?? []), r]);
  const savedDef = isTest(sp.gemt) ? TEST_BY_KEY[sp.gemt] : null;

  return (
    <>
      <h1>Mine tests</h1>
      <p className="muted" style={{ marginTop: -8 }}>
        Resultaterne kommer fra dit ur. Vi finder selv dine hurtigste 5 og 10 km, bedste 20 minutter på cyklen og hurtigste 100 og 1500 m
        i dine ture, også når de er en del af en længere tur. Var det en test, gemmer du den med ét tryk.
      </p>
      {sp.fejl && <p className="status-warn">{sp.fejl}</p>}
      {savedDef && <p className="notice">Resultatet for {savedDef.label.toLowerCase()} er gemt.</p>}

      {connected === 0 && (
        <section className="card bm-connect">
          <div>
            <h2 className="h3">Forbind dit ur for at få testresultater</h2>
            <p className="muted" style={{ margin: 0 }}>
              Testresultater kan kun komme fra et ur eller en cykelcomputer, så de er til at stole på. Forbind Strava, så kommer ture fra Garmin,
              Wahoo, Coros, Polar, Suunto og Apple Watch med.
            </p>
          </div>
          <Link href="/forbindelser" className="button">Forbind dit ur</Link>
        </section>
      )}
      {connected > 0 && pending > 0 && (
        <p className="notice">Vi gennemgår stadig {pending} af dine ture fra uret. Nye resultater dukker op her løbende.</p>
      )}

      {nextTest && (
        <p className="card next-test">
          <span className="pill test-pill">Næste testdag</span> <b>{TEST_BY_KEY[nextTest.testDay!].label}</b> {formatDay(nextTest.startsAt)} kl. {formatTime(nextTest.startsAt)}, {nextTest.location}.{" "}
          <Link href="/kalender">Tilmeld dig i kalenderen</Link>
        </p>
      )}

      <div className="bm-grid">
        {TESTS.map((def) => {
          const list = byTest.get(def.test) ?? [];
          const best = list.length ? list.reduce((a, b) => (score(b) > score(a) ? b : a)) : undefined;
          const latest = list[list.length - 1];
          const diff = change(list[list.length - 2], latest);
          // Forslag: den bedste og den nyeste præstation fra uret, som ikke er gemt
          const found = efforts.filter((e) => e.test === def.test);
          const top = found.length ? found.reduce((a, b) => (score(b) > score(a) ? b : a)) : undefined;
          const suggestions = [...new Set([top, found[0]].filter((e) => e !== undefined))];
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
                  {def.kind === "watts" && best.watts && (
                    me.weightKg
                      ? <p className="bm-wkg"><b>{formatWkg(wattsPerKg(best.watts, me.weightKg))}</b> <span className="muted">ved {me.weightKg.toLocaleString("da-DK")} kg</span></p>
                      : <p className="muted bm-detail"><Link href="/profil">Skriv din vægt</Link> for at se W/kg</p>
                  )}
                  {testdage ? (
                    <ProgressChart
                      points={list.map((r) => ({ date: r.date, score: score(r), label: formatResult(r) }))}
                      testDays={testDays.filter((d) => d.testDay === def.test && d.startsAt <= new Date()).map((d) => d.startsAt)}
                      label={`Udvikling i ${def.label}`}
                    />
                  ) : (
                    <Sparkline values={list.map(score)} label={`Udvikling i ${def.label}`} />
                  )}
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
                            <button className="linklike" type="submit" aria-label={`Fjern resultat fra ${dato(r.date)}`}>Fjern</button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  </details>
                </>
              ) : (
                <p className="muted">Ingen test gemt endnu. {def.help}</p>
              )}
              {suggestions.length > 0 && (
                <div className="bm-found">
                  <p className="bm-found-head">Fra dit ur</p>
                  {suggestions.map((e) => (
                    <form key={e.id} action={saveEffort} className="bm-found-row">
                      <input type="hidden" name="id" value={e.id} />
                      <span>
                        <b>{formatResult(e)}</b> {e === top && found.length > 1 ? "bedste" : ""}
                        <small className="muted">{dato(e.date)} · {e.activity.name}</small>
                      </span>
                      <button className="button small secondary" type="submit">Gem som test</button>
                    </form>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
