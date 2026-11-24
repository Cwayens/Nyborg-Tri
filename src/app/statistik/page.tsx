import Link from "next/link";
import type { AthleteGroup } from "@prisma/client";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { formatHours, startOfWeek } from "@/lib/activities";
import { DISCIPLINE_LABEL, GROUP_LABEL, GROUPS } from "@/lib/roles";
import { clubLeaderboard, personalTotals, personalWeeks } from "@/lib/stats";
import { WeekChart } from "@/components/WeekChart";
import { requireFeature } from "@/lib/features";

export const metadata = { title: "Statistik" };

type Props = { searchParams: Promise<{ gruppe?: string; periode?: string }> };

export default async function Stats({ searchParams }: Props) {
  await requireFeature("statistik");
  const sessionUser = await requireUser("/statistik");
  const sp = await searchParams;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id } });
  const group = GROUPS.includes(sp.gruppe as AthleteGroup) ? (sp.gruppe as AthleteGroup) : null;
  const now = new Date();
  const periods = {
    uge: { label: "Denne uge", from: startOfWeek(now) },
    maaned: { label: "Denne måned", from: new Date(now.getFullYear(), now.getMonth(), 1) },
    aar: { label: "I år", from: new Date(now.getFullYear(), 0, 1) },
  };
  const pKey = (sp.periode && sp.periode in periods ? sp.periode : "maaned") as keyof typeof periods;
  const period = periods[pKey];

  const [weeks, week, year, board] = await Promise.all([
    personalWeeks(user.id),
    personalTotals(user.id, periods.uge.from),
    personalTotals(user.id, periods.aar.from),
    clubLeaderboard(period.from, group),
  ]);
  const clubSec = board.reduce((s, r) => s + r.sec, 0);
  const maxSec = board[0]?.sec ?? 1;
  const q = (o: Record<string, string | null>) => "/statistik?" + new URLSearchParams(Object.entries({ periode: pKey, gruppe: group, ...o }).filter(([, v]) => v) as [string, string][]);

  return (
    <>
      <h1>Statistik</h1>

      <h2>Din træning</h2>
      <div className="stats">
        <Stat value={formatHours(week.sec)} label="denne uge" />
        <Stat value={String(week.count)} label="træninger denne uge" />
        <Stat value={formatHours(year.sec)} label={`i ${now.getFullYear()}`} />
        <Stat value={`${Math.round((year.totals.RUN.m) / 1000)} km`} label="løbet i år" />
        <Stat value={`${Math.round(year.totals.BIKE.m / 1000)} km`} label="cyklet i år" />
        <Stat value={`${(year.totals.SWIM.m / 1000).toLocaleString("da-DK", { maximumFractionDigits: 1 })} km`} label="svømmet i år" />
      </div>
      <section className="card" style={{ marginTop: 14 }}>
        <strong>Timer pr. uge</strong>
        <WeekChart weeks={weeks} />
        {weeks.every((w) => !Object.keys(w.bySport).length) && (
          <p className="muted">Ingen data endnu. <Link href="/forbindelser">Forbind dit ur</Link> eller <Link href="/aktiviteter">registrér en træning</Link>.</p>
        )}
      </section>

      <div className="section-head">
        <h2>Klubben – {period.label.toLowerCase()}</h2>
        <span className="muted">{board.length} medlemmer · {formatHours(clubSec)} i alt</span>
      </div>
      <p className="filters">
        {Object.entries(periods).map(([k, p]) => <Link key={k} href={q({ periode: k })} className={k === pKey ? "active" : undefined}>{p.label}</Link>)}
        <span style={{ width: 12 }} />
        <Link href={q({ gruppe: null })} className={!group ? "active" : undefined}>Alle</Link>
        {GROUPS.map((g) => <Link key={g} href={q({ gruppe: g })} className={group === g ? "active" : undefined}>{GROUP_LABEL[g]}</Link>)}
      </p>
      {!user.shareActivities && (
        <p className="card">Du er ikke med på listen. <Link href="/forbindelser">Slå deling til</Link>, hvis du vil være med.</p>
      )}
      <section className="card">
        {board.length === 0 ? (
          <p className="empty">Ingen delte træninger i perioden endnu.</p>
        ) : (
          board.slice(0, 30).map((r, i) => (
            <div key={r.userId} className="item" style={r.userId === user.id ? { background: "color-mix(in srgb, var(--accent) 8%, transparent)", borderRadius: 8, paddingInline: 8 } : undefined}>
              <strong style={{ width: 28, textAlign: "right" }}>{i + 1}.</strong>
              <div className="body">
                <div className="title">{r.name} {r.group && <span className="pill" style={{ marginLeft: 6 }}>{GROUP_LABEL[r.group]}</span>}</div>
                <div className="bar" style={{ display: "flex" }}>
                  {(["SWIM", "BIKE", "RUN", "STRENGTH", "OTHER"] as const).map((s) => r.bySport[s] ? (
                    <span key={s} className={`disc disc-${s}`} style={{ width: `${(r.bySport[s] / maxSec) * 100}%`, borderRadius: 0 }} title={`${DISCIPLINE_LABEL[s]}: ${formatHours(r.bySport[s])}`} />
                  ) : null)}
                </div>
              </div>
              <strong>{formatHours(r.sec)}</strong>
            </div>
          ))
        )}
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="stat"><div className="value">{value}</div><div className="label">{label}</div></div>;
}
