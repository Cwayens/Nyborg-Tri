import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/auth";
import { canSignUp, membershipExpired } from "@/lib/access";
import { prisma } from "@/lib/db";
import { formatHours, startOfWeek } from "@/lib/activities";
import { dato } from "@/lib/format";
import { currentMembership } from "@/lib/membership";
import { DISCIPLINE_LABEL, GROUP_LABEL, hasRole } from "@/lib/roles";
import { personalTotals, personalWeeks } from "@/lib/stats";
import { formatDay, formatTime } from "@/lib/time";
import { DisciplineIcon, initials } from "@/components/Icons";
import { WeekChart } from "@/components/WeekChart";
import { FROM_WEARABLE, TESTS, formatResult, score } from "@/lib/benchmarks";
import { WorkoutView } from "@/components/WorkoutView";
import { isWorkout, referencesFrom } from "@/lib/workout";
import { toggleSignup } from "../kalender/actions";

export const metadata = { title: "Overblik" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ betaling?: string; kode?: string }> }) {
  const { betaling, kode } = await searchParams;
  const sessionUser = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id }, include: { wearableConnections: { select: { provider: true } } } });
  // Nye brugere skriver først deres navn, så andre kan se hvem der kommer
  if (!user.name) redirect("/profil?velkommen=1");
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);

  const [membership, eligible, mine, groupTrainings, workouts, weeks, week, today, benchmarks, news] = await Promise.all([
    currentMembership(user.id),
    canSignUp(user.id),
    prisma.trainingSession.findMany({ where: { startsAt: { gte: now }, signups: { some: { userId: user.id } } }, orderBy: { startsAt: "asc" }, take: 5 }),
    user.athleteGroup
      ? prisma.trainingSession.findMany({
          where: { startsAt: { gte: now, lt: in7 }, group: user.athleteGroup },
          include: { signups: { include: { user: { select: { id: true, name: true } } } } }, orderBy: { startsAt: "asc" }, take: 6,
        })
      : Promise.resolve([]),
    prisma.groupWorkout.findMany({
      where: { startsAt: { gte: now } },
      include: { participants: { include: { user: { select: { id: true, name: true } } } } }, orderBy: { startsAt: "asc" }, take: 4,
    }),
    personalWeeks(user.id, 6),
    personalTotals(user.id, startOfWeek(now)),
    prisma.trainingSession.count({ where: { startsAt: { gte: now, lte: endOfToday } } }),
    prisma.benchmarkResult.findMany({ where: { userId: user.id, ...FROM_WEARABLE }, select: { test: true, seconds: true, watts: true } }),
    prisma.post.findMany({ where: { published: true }, orderBy: { publishedAt: "desc" }, take: 3, select: { slug: true, title: true, publishedAt: true } }),
  ]);
  const refs = referencesFrom(benchmarks);
  const bestByTest = new Map<string, (typeof benchmarks)[number]>();
  for (const b of benchmarks) {
    const cur = bestByTest.get(b.test);
    if (!cur || score(b) > score(cur)) bestByTest.set(b.test, b);
  }
  const myWorkouts = workouts.filter((w) => w.participants.some((p) => p.user.id === user.id));
  const upcoming = [
    ...mine.map((t) => ({ id: t.id, at: t.startsAt, title: t.cancelledAt ? `Aflyst: ${t.title}` : t.title, where: t.location, d: t.discipline, kind: "Klubtræning", href: "/kalender" })),
    ...myWorkouts.map((w) => ({ id: w.id, at: w.startsAt, title: w.title, where: w.location, d: w.discipline, kind: "Træn sammen", href: "/traen-sammen" })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 5);
  const firstName = user.name?.split(" ")[0];

  return (
    <>
      {betaling === "ok" && <p className="notice">Tak for din betaling! Dit medlemskab er registreret.</p>}
      {kode === "ok" && <p className="notice">Koden er brugt. Du kan nu tilmelde dig træninger.</p>}

      <div className="section-head" style={{ marginTop: 0 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Hej{firstName ? ` ${firstName}` : ""} 👋</h1>
          <p className="muted" style={{ margin: 0 }}>
            {user.athleteGroup ? `${GROUP_LABEL[user.athleteGroup]}-gruppen` : "Ingen gruppe endnu"} ·{" "}
            {membership ? <>Medlem til {dato(membership.endDate)}</> : <Link href="/bliv-medlem">Bliv medlem</Link>}
            {today > 0 && <> · {today} klubtræning{today > 1 ? "er" : ""} i dag</>}
          </p>
        </div>
        {membership && membership.endDate.getTime() - now.getTime() < 30 * 24 * 3600 * 1000 && (
          <Link href="/bliv-medlem" className="button small">Forny medlemskab</Link>
        )}
      </div>

      {(await prisma.athleteProfile.count({ where: { userId: user.id, consentAt: null } })) > 0 && (
        <p className="notice">Klubben vil gerne vise dig på Atleter-siden. <Link href="/profil/atlet">Se din profil og giv samtykke</Link>.</p>
      )}

      {!eligible && !(await membershipExpired(user.id)) && (
        <section className="card" style={{ borderLeft: "4px solid var(--accent)", marginBottom: 18 }}>
          <strong>Kom i gang</strong>
          <p style={{ margin: "6px 0 12px" }}>Betal kontingent, søg om 14 dages gratis prøveperiode eller brug en kode fra klubben. Så kan du tilmelde dig træninger og hoppe med på ture.</p>
          <Link href="/bliv-medlem" className="button small">Se mulighederne</Link>
        </section>
      )}

      <div className="grid two">
        <section className="card">
          <div className="section-head" style={{ margin: "0 0 4px" }}>
            <h2 style={{ fontSize: "1.1rem" }}>Dine næste træninger</h2>
            <Link href="/kalender">Kalender</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="muted">Du er ikke tilmeldt noget endnu. Find en træning nedenfor eller i kalenderen.</p>
          ) : upcoming.map((u) => (
            <Link key={u.id} href={u.href} className="item" style={{ color: "inherit", textDecoration: "none" }}>
              <DisciplineIcon discipline={u.d} />
              <div className="body">
                <div className="title">{u.title}</div>
                <div className="meta">{formatDay(u.at)} kl. {formatTime(u.at)} · {u.where}</div>
              </div>
              <span className="pill">{u.kind}</span>
            </Link>
          ))}
        </section>

        <section className="card">
          <div className="section-head" style={{ margin: "0 0 4px" }}>
            <h2 style={{ fontSize: "1.1rem" }}>Din træning</h2>
            <Link href="/statistik">Statistik</Link>
          </div>
          <div className="stats" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div><div className="value" style={{ fontSize: "1.5rem", fontWeight: 800 }}>{formatHours(week.sec)}</div><div className="muted">denne uge</div></div>
            <div><div className="value" style={{ fontSize: "1.5rem", fontWeight: 800 }}>{week.count}</div><div className="muted">træninger</div></div>
          </div>
          <WeekChart weeks={weeks} />
          {user.wearableConnections.length === 0 && (
            <p style={{ marginBottom: 0 }}><Link href="/forbindelser">Forbind dit ur</Link> så tæller dine træninger automatisk.</p>
          )}
        </section>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <div className="section-head" style={{ margin: "0 0 10px" }}>
          <h2 style={{ fontSize: "1.1rem" }}>Mine tests</h2>
          <Link href="/benchmarks">{bestByTest.size ? "Se udvikling" : "Find tests i dine ture"}</Link>
        </div>
        <div className="bm-mini">
          {TESTS.map((t) => {
            const b = bestByTest.get(t.test);
            return (
              <Link key={t.test} href="/benchmarks" className={`disc disc-${t.discipline}`}>
                <span className="muted">{t.short}</span>
                <b>{b ? formatResult(b) : "–"}</b>
              </Link>
            );
          })}
        </div>
      </section>

      {user.athleteGroup && (
        <>
          <div className="section-head">
            <h2>{GROUP_LABEL[user.athleteGroup]}: de næste 7 dage</h2>
            <Link href="/kalender">Se alle</Link>
          </div>
          {groupTrainings.length === 0 ? <div className="card empty">Ingen træninger for din gruppe den næste uge.</div> : groupTrainings.map((t) => {
            const joined = t.signups.some((s) => s.user.id === user.id);
            return (
              <article key={t.id} className={`card training disc disc-${t.discipline}`}>
                <DisciplineIcon discipline={t.discipline} />
                <div>
                  <span className="disc-label">{DISCIPLINE_LABEL[t.discipline]}</span>
                  <h3 style={t.cancelledAt ? { textDecoration: "line-through" } : undefined}>{t.title}</h3>
                  {t.cancelledAt && <span className="pill warn">Aflyst{t.cancelReason ? `: ${t.cancelReason}` : ""}</span>}
                  <p className="muted">{formatDay(t.startsAt)} kl. {formatTime(t.startsAt)}–{formatTime(t.endsAt)} · {t.location}</p>
                  {isWorkout(t.workout) && <WorkoutView workout={t.workout} discipline={t.discipline} refs={refs} />}
                  <Attendees names={t.signups.map((s) => s.user.name)} />
                </div>
                {eligible && !t.cancelledAt && (
                  <form action={toggleSignup} className="signup">
                    <input type="hidden" name="sessionId" value={t.id} />
                    <button className={`button small${joined ? " secondary" : ""}`} type="submit">{joined ? "✓ Tilmeldt" : "Tilmeld"}</button>
                  </form>
                )}
              </article>
            );
          })}
        </>
      )}

      <div className="section-head">
        <h2>Træn sammen</h2>
        <Link href="/traen-sammen?ny=1">+ Slå en tur op</Link>
      </div>
      {workouts.length === 0 ? (
        <div className="card empty">Ingen ture slået op. <Link href="/traen-sammen?ny=1">Inviter andre med på din næste tur</Link>.</div>
      ) : (
        <div className="card">
          {workouts.map((w) => (
            <Link key={w.id} href="/traen-sammen" className="item" style={{ color: "inherit", textDecoration: "none" }}>
              <DisciplineIcon discipline={w.discipline} />
              <div className="body">
                <div className="title">{w.title}</div>
                <div className="meta">{formatDay(w.startsAt)} kl. {formatTime(w.startsAt)} · {w.location}</div>
              </div>
              <Attendees names={w.participants.map((p) => p.user.name)} compact />
            </Link>
          ))}
        </div>
      )}

      {news.length > 0 && (
        <>
          <div className="section-head">
            <h2>Nyt fra klubben</h2>
            <Link href="/klubben">Klubinfo</Link>
          </div>
          <div className="card">
            {news.map((n) => (
              <Link key={n.slug} href={`/nyheder/${n.slug}`} className="item" style={{ color: "inherit", textDecoration: "none" }}>
                <div className="body">
                  <div className="title">{n.title}</div>
                  <div className="meta">{dato(n.publishedAt)}</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {hasRole(user.role, "TRAINER") && <RoleShortcuts admin={user.role === "ADMIN"} />}
    </>
  );
}

function Attendees({ names, compact }: { names: (string | null)[]; compact?: boolean }) {
  if (!names.length) return compact ? null : <p className="muted attendees" style={{ margin: 0 }}>Ingen tilmeldte endnu</p>;
  return (
    <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span className="avatars">{names.slice(0, 5).map((n, i) => <span key={i} className="avatar" title={n ?? ""}>{initials(n)}</span>)}</span>
      {!compact && <span className="muted attendees">{names.length} kommer</span>}
    </span>
  );
}

async function RoleShortcuts({ admin }: { admin: boolean }) {
  const [pendingTrials, active] = admin
    ? await Promise.all([
        prisma.trialRequest.count({ where: { status: "PENDING" } }),
        prisma.membership.findMany({ where: { endDate: { gt: new Date() } }, distinct: ["userId"], select: { userId: true } }),
      ])
    : [0, []];
  return (
    <>
      <div className="section-head"><h2>Genveje</h2></div>
      <div className="grid">
        <Link href="/traener/ny" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <strong>Opret træning</strong><p className="muted" style={{ margin: 0 }}>Læg en træning i kalenderen for en gruppe</p>
        </Link>
        <Link href="/traener" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <strong>Mine træninger og deltagere</strong><p className="muted" style={{ margin: 0 }}>Se hvem der kommer</p>
        </Link>
        {admin && (
          <>
            <Link href="/admin/adgang" className="card" style={{ textDecoration: "none", color: "inherit" }}>
              <strong>Prøveperioder {pendingTrials > 0 && <span className="pill warn">{pendingTrials} afventer</span>}</strong>
              <p className="muted" style={{ margin: 0 }}>Godkend ansøgninger og lav koder</p>
            </Link>
            <Link href="/admin" className="card" style={{ textDecoration: "none", color: "inherit" }}>
              <strong>Medlemmer</strong><p className="muted" style={{ margin: 0 }}>{active.length} aktive medlemskaber</p>
            </Link>
          </>
        )}
      </div>
    </>
  );
}
