import Link from "next/link";
import type { BenchmarkTest, Gender } from "@prisma/client";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { LEADERBOARD, TEST_BY_KEY, formatDetail, formatDuration, formatResult, ftpFromTwenty, isLeaderboardTest } from "@/lib/benchmarks";
import { AGE_GROUPS, GENDER_LABEL, GENDER_PREFIX, ageGroup, formatWkg, wattsPerKg, leaderboardProviders, rankBest, rankImprovement, type AgeGroup, type Ranked } from "@/lib/efforts";
import { DisciplineIcon, initials } from "@/components/Icons";
import { joinLeaderboard, leaveLeaderboard, setWeight } from "./actions";
import { requireFeature } from "@/lib/features";

export const metadata = { title: "Leaderboard" };

type Props = { searchParams: Promise<{ vis?: string; test?: string; koen?: string; ag?: string; fejl?: string }> };

const TOP_PER_GROUP = 5;

export default async function Leaderboard({ searchParams }: Props) {
  await requireFeature("leaderboard");
  const sessionUser = await requireUser("/leaderboard");
  const sp = await searchParams;
  const me = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: { id: true, gender: true, birthDate: true, leaderboard: true, weightKg: true, _count: { select: { wearableConnections: true } } },
  });

  const year = new Date().getFullYear();
  const view = sp.vis === "fremgang" ? "fremgang" : "bedste";
  const test: BenchmarkTest = isLeaderboardTest(sp.test) ? sp.test : "RUN_5K";
  const gender: Gender = sp.koen === "K" ? "FEMALE" : sp.koen === "M" ? "MALE" : me.gender ?? "MALE";
  const ag = AGE_GROUPS.includes(sp.ag as AgeGroup) ? (sp.ag as AgeGroup) : null;
  const def = TEST_BY_KEY[test];

  const users = await prisma.user.findMany({
    where: { leaderboard: true, gender, birthDate: { not: null } },
    select: { id: true, name: true, gender: true, birthDate: true, weightKg: true },
  });
  const athletes = users.map((u) => ({ ...u, gender: u.gender!, birthDate: u.birthDate! }));
  const rows = await prisma.effort.findMany({
    where: {
      test,
      userId: { in: athletes.map((a) => a.id) },
      date: { gte: new Date(view === "fremgang" ? year - 1 : year, 0, 1), lt: new Date(year + 1, 0, 1) },
      activity: { provider: { in: leaderboardProviders() } },
    },
    select: { userId: true, test: true, seconds: true, watts: true, date: true },
  });
  const ranked = view === "fremgang" ? rankImprovement(athletes, rows, year) : rankBest(athletes, rows, year);
  const groups = AGE_GROUPS.map((g) => ({ g, list: ranked.filter((r) => r.ag === g) })).filter((x) => x.list.length > 0);
  const shown = ag ? groups.filter((x) => x.g === ag) : groups;

  const q = (p: Partial<Record<"vis" | "test" | "koen" | "ag", string | null>>) => {
    const cur = { vis: view === "fremgang" ? "fremgang" : null, test, koen: GENDER_PREFIX[gender], ag, ...p };
    const s = new URLSearchParams(Object.entries(cur).filter((e): e is [string, string] => !!e[1]));
    return `/leaderboard?${s}`;
  };
  const myAg = ageGroup(me.birthDate, year);
  const disciplines = ["RUN", "BIKE", "SWIM"] as const;

  return (
    <>
      <h1>Leaderboard {year}</h1>
      <p className="muted" style={{ marginTop: -8 }}>
        Klubbens bedste præstationer i år, målt med ur eller cykelcomputer. Vi finder dem automatisk i alle ture, også når fx en 5 km
        er en del af et længere løb. Aldersgrupper som hos Ironman: din alder pr. 31. december.
      </p>
      {sp.fejl && <p className="status-warn">{sp.fejl}</p>}

      {!me.leaderboard ? (
        <form action={joinLeaderboard} className="card lb-join">
          <div>
            <h2 className="h3">Vil du være med?</h2>
            <p className="muted" style={{ margin: 0 }}>
              Det er frivilligt. Andre medlemmer kan se dit navn, din aldersgruppe og dine bedste tider og watt. Du kan altid melde dig fra igen.
              {me._count.wearableConnections === 0 && <> Du skal også <Link href="/forbindelser">forbinde dit ur</Link>, før dine ture tæller.</>}
            </p>
          </div>
          <div className="row">
            <label>Klasse
              <select name="gender" defaultValue={me.gender ?? ""} required>
                <option value="" disabled>Vælg</option>
                <option value="FEMALE">Kvinder</option>
                <option value="MALE">Mænd</option>
              </select>
            </label>
            {!me.birthDate && <label>Fødselsdato<input type="date" name="birthDate" required /></label>}
          </div>
          <button className="button" type="submit">Vis mig på leaderboardet</button>
        </form>
      ) : (
        <div className="muted lb-me">
          Du er med{myAg ? ` i ${GENDER_PREFIX[me.gender!]}${myAg}` : ""}.{" "}
          <form action={leaveLeaderboard} style={{ display: "inline" }}><button className="linklike" type="submit">Meld mig fra</button></form>
        </div>
      )}

      <nav className="filters" aria-label="Visning">
        <Link href={q({ vis: null })} className={view === "bedste" ? "active" : undefined} aria-current={view === "bedste" ? "page" : undefined}>Årets bedste</Link>
        <Link href={q({ vis: "fremgang" })} className={view === "fremgang" ? "active" : undefined} aria-current={view === "fremgang" ? "page" : undefined}>Mest fremgang</Link>
      </nav>

      <div className="lb-tests">
        {disciplines.map((d) => (
          <div key={d} className={`lb-disc disc disc-${d}`}>
            <DisciplineIcon discipline={d} />
            {LEADERBOARD.filter((t) => t.discipline === d).map((t) => (
              <Link key={t.test} href={q({ test: t.test })} className={t.test === test ? "active" : undefined} aria-current={t.test === test ? "true" : undefined}>
                {t.short}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="lb-filter">
        <nav className="seg" aria-label="Klasse">
          {(["FEMALE", "MALE"] as const).map((g) => (
            <Link key={g} href={q({ koen: GENDER_PREFIX[g] })} className={g === gender ? "active" : undefined} aria-current={g === gender ? "true" : undefined}>{GENDER_LABEL[g]}</Link>
          ))}
        </nav>
        <nav className="lb-ags" aria-label="Aldersgruppe">
          <Link href={q({ ag: null })} className={!ag ? "active" : undefined}>Alle</Link>
          {groups.map(({ g }) => (
            <Link key={g} href={q({ ag: g })} className={g === ag ? "active" : undefined}>{GENDER_PREFIX[gender]}{g}</Link>
          ))}
        </nav>
      </div>

      {def.kind === "watts" && me.leaderboard && !me.weightKg && (
        <form action={setWeight} className="card lb-join lb-weight">
          <div>
            <h2 className="h3" style={{ margin: 0 }}>Skriv din vægt for at komme med på FTP-listen</h2>
            <p className="muted" style={{ margin: "4px 0 0" }}>FTP sammenlignes i watt pr. kg. Andre ser kun dine W/kg, aldrig din vægt.</p>
          </div>
          <input type="hidden" name="back" value={q({})} />
          <label>Vægt (kg)<input name="weight" inputMode="decimal" required placeholder="fx 72,5" style={{ width: 120 }} /></label>
          <button className="button" type="submit">Gem</button>
        </form>
      )}
      <p className="muted lb-explain">
        {view === "fremgang"
          ? `Fremgang i ${def.label.toLowerCase()}: årets bedste sammenlignet med bedste i ${year - 1}.`
          : def.kind === "watts"
            ? "FTP i watt pr. kg kropsvægt. FTP er 95 % af den bedste gennemsnitlige watt over 20 minutter. Kun atleter, der har skrevet deres vægt, er med."
            : `Hurtigste ${def.short} i år.`}
      </p>

      {ranked.length === 0 || shown.length === 0 ? (
        <div className="card empty">
          <p style={{ margin: 0 }}>
            {view === "fremgang"
              ? `Ingen har både en ${def.short} fra ${year - 1} og fra i år endnu.`
              : `Ingen ${GENDER_LABEL[gender].toLowerCase()} har en ${def.short} på leaderboardet endnu.`}
          </p>
        </div>
      ) : !ag ? (
        // "Alle": én samlet rangliste fra første til sidste, med aldersgruppen ved hvert navn
        <section className="card lb-group lb-all">
          <header>
            <h2>{GENDER_LABEL[gender]}, alle aldersgrupper</h2>
            <span className="muted">{ranked.length} {ranked.length === 1 ? "atlet" : "atleter"}</span>
          </header>
          <ol className="lb-list">
            {ranked.map((r, i) => (
              <Row key={r.athlete.id} r={r} place={i + 1} me={r.athlete.id === me.id} view={view} ag={`${GENDER_PREFIX[gender]}${r.ag}`} agHref={q({ ag: r.ag })} />
            ))}
          </ol>
        </section>
      ) : (
        <div className="lb-groups">
          {shown.map(({ g, list }) => (
            <section key={g} className="card lb-group">
              <header>
                <h2>{GENDER_PREFIX[gender]}{g}</h2>
                <span className="muted">{list.length} {list.length === 1 ? "atlet" : "atleter"}</span>
              </header>
              <ol className="lb-list">
                {(ag ? list : list.slice(0, TOP_PER_GROUP)).map((r, i) => (
                  <Row key={r.athlete.id} r={r} place={i + 1} me={r.athlete.id === me.id} view={view} />
                ))}
              </ol>
              {!ag && list.length > TOP_PER_GROUP && <Link href={q({ ag: g })} className="lb-more">Se alle {list.length}</Link>}
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function Row({ r, place, me, view, ag, agHref }: { r: Ranked; place: number; me: boolean; view: string; ag?: string; agHref?: string }) {
  const name = r.athlete.name ?? "Uden navn";
  return (
    <li className={me ? "me" : undefined}>
      <span className={`lb-place${place <= 3 ? ` p${place}` : ""}`}>{place}</span>
      <span className="avatar">{initials(name)}</span>
      <span className="lb-name">
        <b>{name}{me && <small> (dig)</small>}</b>
        <small className="muted">
          {ag && agHref && <><Link href={agHref} className="pill lb-ag">{ag}</Link> </>}
          {shortDate(r.best.date)}
        </small>
      </span>
      {view === "fremgang" ? (
        <span className="lb-result">
          <b>+{r.improvement!.toLocaleString("da-DK", { maximumFractionDigits: 1 })} %</b>
          <small className="muted">{short(r.previous!, r.athlete.weightKg)} → {short(r.best, r.athlete.weightKg)}</small>
        </span>
      ) : (
        <span className="lb-result">
          {r.best.watts && r.athlete.weightKg ? (
            <>
              <b>{formatWkg(wattsPerKg(r.best.watts, r.athlete.weightKg))}</b>
              <small className="muted">FTP {formatResult(r.best)}</small>
            </>
          ) : (
            <>
              <b>{formatResult(r.best)}</b>
              <small className="muted">{formatDetail(r.best)}</small>
            </>
          )}
        </span>
      )}
    </li>
  );
}

function shortDate(d: Date): string {
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short", timeZone: "Europe/Copenhagen" });
}

function short(e: Ranked["best"], kg?: number | null): string {
  if (e.watts) return kg ? formatWkg(wattsPerKg(e.watts, kg)) : `${ftpFromTwenty(e.watts)} W`;
  return formatDuration(e.seconds ?? 0);
}
