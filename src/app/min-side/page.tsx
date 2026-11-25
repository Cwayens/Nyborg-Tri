import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/auth";
import { assignMentor } from "@/lib/mentor";
import { canSignUp, membershipExpired } from "@/lib/access";
import { prisma } from "@/lib/db";
import { formatHours, startOfWeek } from "@/lib/activities";
import { dato } from "@/lib/format";
import { currentMembership } from "@/lib/membership";
import { disciplineLabel, hasRole } from "@/lib/roles";
import { personalTotals, personalWeeks } from "@/lib/stats";
import { formatDay, formatTime } from "@/lib/time";
import { DisciplineIcon, initials } from "@/components/Icons";
import { NewsStories } from "@/components/NewsStories";
import { WeekChart } from "@/components/WeekChart";
import { FROM_WEARABLE, TESTS, formatResult, score } from "@/lib/benchmarks";
import { WorkoutView } from "@/components/WorkoutView";
import { isWorkout, referencesFrom } from "@/lib/workout";
import { toggleSignup } from "../kalender/actions";
import { GrowSection } from "@/components/GrowSection";
import { TrophySection } from "@/components/TrophySection";
import { featuresOff, isOn } from "@/lib/features";
import { NOT_CHILD } from "@/lib/child-safety";
import { teamsFor } from "@/lib/visibility";
import { getLocale, tr, translator, type T } from "@/lib/i18n";

export async function generateMetadata() {
  const t = await tr();
  return { title: t("Overblik", "Overview") };
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ betaling?: string; kode?: string }> }) {
  const { betaling, kode } = await searchParams;
  const loc = await getLocale();
  const t = translator(loc);
  const sessionUser = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id }, include: { wearableConnections: { select: { provider: true } }, team: { select: { name: true, branch: { select: { name: true } } } } } });
  // Med flere afdelinger står afdelingen efter holdnavnet
  const teamName = user.team ? (user.team.branch && (await prisma.branch.count()) > 1 ? `${user.team.name} (${user.team.branch.name})` : user.team.name) : "";
  // Nye brugere skriver først deres navn, så andre kan se hvem der kommer
  if (!user.name) redirect("/profil?velkommen=1");
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);

  const [membership, eligible, mine, groupTrainings, workouts, weeks, week, today, benchmarks, news] = await Promise.all([
    currentMembership(user.id),
    canSignUp(user.id),
    prisma.trainingSession.findMany({ where: { startsAt: { gte: now }, signups: { some: { userId: user.id } } }, orderBy: { startsAt: "asc" }, take: 5 }),
    user.teamId && (await teamsFor(user.id)).includes(user.teamId)
      ? prisma.trainingSession.findMany({
          where: { startsAt: { gte: now, lt: in7 }, teamId: user.teamId },
          include: { signups: { include: { user: { select: { id: true, name: true } } } } }, orderBy: { startsAt: "asc" }, take: 6,
        })
      : Promise.resolve([]),
    // Træn sammen: ikke for børn, og voksne ser aldrig børn på listerne (child-safety.ts)
    (await isOn("traensammen"))
      ? prisma.groupWorkout.findMany({
          where: { startsAt: { gte: now }, host: NOT_CHILD },
          include: { participants: { where: { user: NOT_CHILD }, include: { user: { select: { id: true, name: true } } } } }, orderBy: { startsAt: "asc" }, take: 4,
        })
      : Promise.resolve([]),
    personalWeeks(user.id, 6),
    personalTotals(user.id, startOfWeek(now)),
    prisma.trainingSession.count({ where: { startsAt: { gte: now, lte: endOfToday }, teamId: { in: await teamsFor(user.id) } } }),
    prisma.benchmarkResult.findMany({ where: { userId: user.id, ...FROM_WEARABLE }, select: { test: true, seconds: true, watts: true } }),
    prisma.post.findMany({ where: { published: true }, orderBy: { publishedAt: "desc" }, take: 8, select: { slug: true, title: true, publishedAt: true, featuredImage: true, images: true, categories: true } }),
  ]);
  // Bad om en mentor ved indmeldelsen: tildel en, så snart medlemmet har adgang (assignMentor afviser børn)
  const mentorNow = user.wantsMentor && eligible && (await isOn("mentor")) ? await assignMentor(user.id) : null;
  const refs = referencesFrom(benchmarks);
  const bestByTest = new Map<string, (typeof benchmarks)[number]>();
  for (const b of benchmarks) {
    const cur = bestByTest.get(b.test);
    if (!cur || score(b) > score(cur)) bestByTest.set(b.test, b);
  }
  const myWorkouts = workouts.filter((w) => w.participants.some((p) => p.user.id === user.id));
  const upcoming = [
    ...mine.map((x) => ({ id: x.id, at: x.startsAt, title: x.cancelledAt ? `${t("Aflyst", "Cancelled")}: ${x.title}` : x.title, where: x.location, d: x.discipline, kind: t("Klubtræning", "Club training"), href: "/kalender" })),
    ...myWorkouts.map((w) => ({ id: w.id, at: w.startsAt, title: w.title, where: w.location, d: w.discipline, kind: t("Træn sammen", "Train together"), href: "/traen-sammen" })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 5);
  const firstName = user.name?.split(" ")[0];
  const off = await featuresOff();

  return (
    <>
      {betaling === "ok" && <p className="notice">{t("Tak for din betaling! Dit medlemskab er registreret.", "Thanks for your payment! Your membership is registered.")}</p>}
      {kode === "ok" && <p className="notice">{t("Koden er brugt. Du kan nu tilmelde dig træninger.", "The code is used. You can now sign up for trainings.")}</p>}

      <div className="section-head" style={{ marginTop: 0 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{t("Hej", "Hi")}{firstName ? ` ${firstName}` : ""} 👋</h1>
          <p className="muted" style={{ margin: 0 }}>
            {user.team ? `${t("Hold", "Team")}: ${teamName}` : t("Intet hold endnu", "No team yet")} ·{" "}
            {membership ? <>{t("Medlem til", "Member until")} {dato(membership.endDate, loc)}</> : <Link href="/bliv-medlem">{t("Bliv medlem", "Join")}</Link>}
            {today > 0 && <> · {loc === "en" ? `${today} club training${today > 1 ? "s" : ""} today` : `${today} klubtræning${today > 1 ? "er" : ""} i dag`}</>}
          </p>
        </div>
        {membership && membership.endDate.getTime() - now.getTime() < 30 * 24 * 3600 * 1000 && (
          <Link href="/bliv-medlem" className="button small">{t("Forny medlemskab", "Renew membership")}</Link>
        )}
      </div>

      <NewsStories posts={news} loc={loc} />
      {mentorNow?.ok && <p className="notice">{t(`Du har fået ${mentorNow.mentorName ?? "en mentor"} som mentor. I har begge fået en mail.`, `${mentorNow.mentorName ?? "A clubmate"} is now your mentor. You've both had an email.`)} <Link href="/mentor">{t("Se mentorordningen", "See the mentor scheme")}</Link></p>}

      {(await prisma.athleteProfile.count({ where: { userId: user.id, consentAt: null } })) > 0 && (
        <p className="notice">{t("Klubben vil gerne vise dig på Atleter-siden.", "The club would like to show you on the Athletes page.")} <Link href="/profil/atlet">{t("Se din profil og giv samtykke", "See your profile and give consent")}</Link>.</p>
      )}

      {!eligible && !(await membershipExpired(user.id)) && (
        <section className="card" style={{ borderLeft: "4px solid var(--accent)", marginBottom: 18 }}>
          <strong>{t("Kom i gang", "Get started")}</strong>
          <p style={{ margin: "6px 0 12px" }}>{t("Betal kontingent, søg om 14 dages gratis prøveperiode eller brug en kode fra klubben. Så kan du tilmelde dig træninger og hoppe med på ture.", "Pay your fee, apply for a free 14-day trial or use a code from the club. Then you can sign up for trainings and join sessions.")}</p>
          <Link href="/bliv-medlem" className="button small">{t("Se mulighederne", "See the options")}</Link>
        </section>
      )}

      <div className="grid two">
        <section className="card">
          <div className="section-head" style={{ margin: "0 0 4px" }}>
            <h2 style={{ fontSize: "1.1rem" }}>{t("Dine næste træninger", "Your next trainings")}</h2>
            <Link href="/kalender">{t("Kalender", "Calendar")}</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="muted">{t("Du er ikke tilmeldt noget endnu. Find en træning nedenfor eller i kalenderen.", "You haven't signed up for anything yet. Find a training below or in the calendar.")}</p>
          ) : upcoming.map((u) => (
            <Link key={u.id} href={u.href} className="item" style={{ color: "inherit", textDecoration: "none" }}>
              <DisciplineIcon discipline={u.d} />
              <div className="body">
                <div className="title">{u.title}</div>
                <div className="meta">{formatDay(u.at, loc)} {t("kl.", "at")} {formatTime(u.at, loc)} · {u.where}</div>
              </div>
              <span className="pill">{u.kind}</span>
            </Link>
          ))}
        </section>

        <section className="card">
          <div className="section-head" style={{ margin: "0 0 4px" }}>
            <h2 style={{ fontSize: "1.1rem" }}>{t("Din træning", "Your training")}</h2>
            {!off.has("statistik") && <Link href="/statistik">{t("Statistik", "Statistics")}</Link>}
          </div>
          <p className="tb-summary">
            <b>{formatHours(week.sec, loc)}</b> <span className="muted">{t("denne uge", "this week")} · {week.count} {loc === "en" ? (week.count === 1 ? "session" : "sessions") : week.count === 1 ? "træning" : "træninger"}</span>
          </p>
          <WeekChart weeks={weeks} loc={loc} />
          {user.wearableConnections.length === 0 && (
            <p style={{ marginBottom: 0 }}><Link href="/forbindelser">{t("Forbind dit ur", "Connect your watch")}</Link> {t("så tæller dine træninger automatisk.", "and your training counts automatically.")}</p>
          )}
        </section>
      </div>

      <TrophySection userId={user.id} loc={loc} />

      {!off.has("tests") && (
      <section className="card" style={{ marginTop: 18 }}>
        <div className="section-head" style={{ margin: "0 0 10px" }}>
          <h2 style={{ fontSize: "1.1rem" }}>{t("Mine tests", "My tests")}</h2>
          <Link href="/benchmarks">{bestByTest.size ? t("Se udvikling", "See progress") : t("Find tests i dine ture", "Find tests in your sessions")}</Link>
        </div>
        <div className="bm-mini">
          {TESTS.map((x) => {
            const b = bestByTest.get(x.test);
            return (
              <Link key={x.test} href="/benchmarks" className={`disc disc-${x.discipline}`}>
                <span className="muted">{x.short}</span>
                <b>{b ? formatResult(b) : "–"}</b>
              </Link>
            );
          })}
        </div>
      </section>
      )}

      {user.team && (
        <>
          <div className="section-head">
            <h2>{teamName}: {t("de næste 7 dage", "the next 7 days")}</h2>
            <Link href="/kalender">{t("Se alle", "See all")}</Link>
          </div>
          {groupTrainings.length === 0 ? <div className="card empty">{t("Ingen træninger for dit hold den næste uge.", "No trainings for your team in the next week.")}</div> : groupTrainings.map((g) => {
            const joined = g.signups.some((s) => s.user.id === user.id);
            return (
              <article key={g.id} className={`card training disc disc-${g.discipline}`}>
                <DisciplineIcon discipline={g.discipline} />
                <div>
                  <span className="disc-label">{disciplineLabel(g.discipline, loc)}</span>
                  <h3 style={g.cancelledAt ? { textDecoration: "line-through" } : undefined}>{g.title}</h3>
                  {g.cancelledAt && <span className="pill warn">{t("Aflyst", "Cancelled")}{g.cancelReason ? `: ${g.cancelReason}` : ""}</span>}
                  <p className="muted">{formatDay(g.startsAt, loc)} {t("kl.", "at")} {formatTime(g.startsAt, loc)}–{formatTime(g.endsAt, loc)} · {g.location}</p>
                  {isWorkout(g.workout) && <WorkoutView workout={g.workout} discipline={g.discipline} refs={refs} downloadId={joined ? g.id : undefined} />}
                  <Attendees t={t} names={g.signups.map((s) => s.user.name)} />
                </div>
                {eligible && !g.cancelledAt && (
                  <form action={toggleSignup} className="signup">
                    <input type="hidden" name="sessionId" value={g.id} />
                    <button className={`button small${joined ? " secondary" : ""}`} type="submit">{joined ? t("✓ Tilmeldt", "✓ Signed up") : t("Tilmeld", "Sign up")}</button>
                  </form>
                )}
              </article>
            );
          })}
        </>
      )}

      <GrowSection userId={user.id} joinedAt={user.createdAt} loc={loc} />

      {!off.has("traensammen") && (
        <>
      <div className="section-head">
        <h2>{t("Træn sammen", "Train together")}</h2>
        <Link href="/traen-sammen?ny=1">{t("+ Slå en tur op", "+ Post a session")}</Link>
      </div>
      {workouts.length === 0 ? (
        <div className="card empty">{t("Ingen ture slået op.", "No sessions posted.")} <Link href="/traen-sammen?ny=1">{t("Inviter andre med på din næste tur", "Invite others to your next session")}</Link>.</div>
      ) : (
        <div className="card">
          {workouts.map((w) => (
            <Link key={w.id} href="/traen-sammen" className="item" style={{ color: "inherit", textDecoration: "none" }}>
              <DisciplineIcon discipline={w.discipline} />
              <div className="body">
                <div className="title">{w.title}</div>
                <div className="meta">{formatDay(w.startsAt, loc)} {t("kl.", "at")} {formatTime(w.startsAt, loc)} · {w.location}</div>
              </div>
              <Attendees t={t} names={w.participants.map((p) => p.user.name)} compact />
            </Link>
          ))}
        </div>
      )}
        </>
      )}


      {hasRole(user.role, "TRAINER") && <RoleShortcuts t={t} admin={user.role === "ADMIN"} />}
    </>
  );
}

function Attendees({ t, names, compact }: { t: T; names: (string | null)[]; compact?: boolean }) {
  if (!names.length) return compact ? null : <p className="muted attendees" style={{ margin: 0 }}>{t("Ingen tilmeldte endnu", "No one signed up yet")}</p>;
  return (
    <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span className="avatars">{names.slice(0, 5).map((n, i) => <span key={i} className="avatar" title={n ?? ""}>{initials(n)}</span>)}</span>
      {!compact && <span className="muted attendees">{names.length} {t("kommer", "coming")}</span>}
    </span>
  );
}

async function RoleShortcuts({ t, admin }: { t: T; admin: boolean }) {
  const [pendingTrials, active] = admin
    ? await Promise.all([
        prisma.trialRequest.count({ where: { status: "PENDING" } }),
        prisma.membership.findMany({ where: { endDate: { gt: new Date() } }, distinct: ["userId"], select: { userId: true } }),
      ])
    : [0, []];
  return (
    <>
      <div className="section-head"><h2>{t("Genveje", "Shortcuts")}</h2></div>
      <div className="grid">
        <Link href="/traener/ny" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <strong>{t("Opret træning", "Create training")}</strong><p className="muted" style={{ margin: 0 }}>{t("Læg en træning i kalenderen for et hold", "Add a training to the calendar for a team")}</p>
        </Link>
        <Link href="/traener" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <strong>{t("Mine træninger og deltagere", "My trainings and attendees")}</strong><p className="muted" style={{ margin: 0 }}>{t("Se hvem der kommer", "See who's coming")}</p>
        </Link>
        {admin && (
          <>
            <Link href="/admin/adgang" className="card" style={{ textDecoration: "none", color: "inherit" }}>
              <strong>{t("Prøveperioder", "Trials")} {pendingTrials > 0 && <span className="pill warn">{pendingTrials} {t("afventer", "pending")}</span>}</strong>
              <p className="muted" style={{ margin: 0 }}>{t("Godkend ansøgninger og lav koder", "Approve applications and create codes")}</p>
            </Link>
            <Link href="/admin" className="card" style={{ textDecoration: "none", color: "inherit" }}>
              <strong>{t("Medlemmer", "Members")}</strong><p className="muted" style={{ margin: 0 }}>{active.length} {t("aktive medlemskaber", "active memberships")}</p>
            </Link>
          </>
        )}
      </div>
    </>
  );
}
