import Link from "next/link";
import type { AthleteGroup } from "@prisma/client";
import { auth, requireUser } from "@/auth";
import { canSignUp } from "@/lib/access";
import { prisma } from "@/lib/db";
import { DISCIPLINE_LABEL, GROUP_LABEL, GROUPS, canJoinGroup, trainingVisibleFor } from "@/lib/roles";
import { dayKey, formatDay, formatTime, parseLocal } from "@/lib/time";
import { toggleSignup } from "./actions";
import { WorkoutView } from "@/components/WorkoutView";
import { isWorkout, referencesFrom } from "@/lib/workout";

export const metadata = { title: "Kalender" };

type Props = { searchParams: Promise<{ gruppe?: string; maaned?: string; dag?: string }> };

const WEEKDAYS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
const MONTHS = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];
const pad = (n: number) => String(n).padStart(2, "0");

export default async function Calendar({ searchParams }: Props) {
  await requireUser("/kalender");
  const sp = await searchParams;
  const session = await auth();
  const own = session?.user.athleteGroup ?? null;
  // Atleter ser som standard deres egen gruppe; "alle" viser alt
  const group: AthleteGroup | null =
    sp.gruppe === "alle" ? null : GROUPS.includes(sp.gruppe as AthleteGroup) ? (sp.gruppe as AthleteGroup) : own;

  // Måned (dansk tid). ?maaned=2026-11
  const todayKey = dayKey(new Date());
  const [y, m] = (/^\d{4}-\d{2}$/.test(sp.maaned ?? "") ? sp.maaned! : todayKey.slice(0, 7)).split("-").map(Number);
  const monthKey = `${y}-${pad(m)}`;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // 0 = mandag
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;

  const sessions = (
    await prisma.trainingSession.findMany({
      where: { startsAt: { gte: parseLocal(`${monthKey}-01T00:00`), lt: parseLocal(`${next}-01T00:00`) } },
      include: {
        createdBy: { select: { name: true } },
        signups: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { startsAt: "asc" },
    })
  ).filter((s) => trainingVisibleFor(s.group, group));

  const days = new Map<string, typeof sessions>();
  for (const s of sessions) days.set(dayKey(s.startsAt), [...(days.get(dayKey(s.startsAt)) ?? []), s]);

  const userId = session?.user.id ?? null;
  const eligible = userId ? await canSignUp(userId) : false;
  const refs = userId
    ? referencesFrom(await prisma.benchmarkResult.findMany({ where: { userId }, select: { test: true, seconds: true, watts: true } }))
    : null;

  // Valgt dag: ?dag=, ellers næste dag med træning fra i dag, ellers første dag med træning i måneden
  const keys = [...days.keys()];
  const selected =
    sp.dag?.startsWith(monthKey) ? sp.dag
    : keys.find((k) => k >= todayKey) ?? keys[0] ?? (todayKey.startsWith(monthKey) ? todayKey : `${monthKey}-01`);
  const selectedList = days.get(selected) ?? [];

  const gq = `gruppe=${group ?? "alle"}`;
  const url = (month: string, day?: string) => `/kalender?${gq}&maaned=${month}${day ? `&dag=${day}` : ""}`;
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${monthKey}-${pad(i + 1)}`),
  ];
  while (cells.length % 7) cells.push(null);

  return (
    <>
      <div className="section-head" style={{ marginTop: 0 }}>
        <h1 style={{ margin: 0 }}>Kalender</h1>
        <Link href="/forbindelser" className="muted">Få kalenderen på telefonen →</Link>
      </div>
      <p className="filters">
        <span className="muted">Vis:</span>
        <Link href={`/kalender?gruppe=alle&maaned=${monthKey}`} className={group === null ? "active" : undefined}>Alle</Link>
        {GROUPS.map((g) => (
          <Link key={g} href={`/kalender?gruppe=${g}&maaned=${monthKey}`} className={group === g ? "active" : undefined}>
            {GROUP_LABEL[g]}{own === g ? " (min gruppe)" : ""}
          </Link>
        ))}
      </p>

      {!eligible && (
        <p className="card">
          Du kan tilmelde dig træninger, når du har betalt kontingent, fået en prøveperiode eller brugt en kode.{" "}
          <Link href="/bliv-medlem">Se mulighederne</Link>
        </p>
      )}
      {eligible && !own && session!.user.role === "ATHLETE" && (
        <p className="card">Du er endnu ikke tilknyttet en gruppe (Elite, Bredde eller Børn). Kontakt bestyrelsen, så du kan tilmelde dig træninger.</p>
      )}

      <section className="month card" aria-label={`${MONTHS[m - 1]} ${y}`}>
        <header className="month-head">
          <Link href={url(prev)} className="button ghost small" aria-label="Forrige måned">‹</Link>
          <h2>{MONTHS[m - 1].replace(/^./, (c) => c.toUpperCase())} {y}</h2>
          <Link href={url(next)} className="button ghost small" aria-label="Næste måned">›</Link>
          {!todayKey.startsWith(monthKey) && <Link href={url(todayKey.slice(0, 7), todayKey)} className="month-today">I dag</Link>}
        </header>
        <div className="month-grid" role="grid">
          {WEEKDAYS.map((d) => <div key={d} className="month-wd" role="columnheader">{d}</div>)}
          {cells.map((key, i) => {
            if (!key) return <div key={`x${i}`} className="month-cell empty" />;
            const list = days.get(key) ?? [];
            const mine = userId ? list.some((s) => s.signups.some((x) => x.user.id === userId)) : false;
            const cls = ["month-cell", key === todayKey && "today", key === selected && "selected", key < todayKey && "past", mine && "mine"].filter(Boolean).join(" ");
            return (
              <Link key={key} href={url(monthKey, key)} className={cls} role="gridcell" aria-current={key === selected ? "date" : undefined} scroll={false}
                aria-label={`${Number(key.slice(8))}. ${MONTHS[m - 1]}: ${list.length ? `${list.length} træning${list.length > 1 ? "er" : ""}` : "ingen træninger"}`}>
                <span className="month-num">{Number(key.slice(8))}</span>
                <span className="month-items">
                  {list.slice(0, 3).map((s) => (
                    <span key={s.id} className={`month-item disc disc-${s.discipline}${s.cancelledAt ? " cancelled" : ""}`}>
                      <i />{formatTime(s.startsAt)} {s.title}
                    </span>
                  ))}
                  {list.length > 3 && <span className="month-more">+{list.length - 3} mere</span>}
                </span>
                <span className="month-dots" aria-hidden="true">
                  {list.slice(0, 4).map((s) => <i key={s.id} className={`disc disc-${s.discipline}${s.cancelledAt ? " cancelled" : ""}`} />)}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="day" id="dag">
        <h2>{formatDay(parseLocal(`${selected}T12:00`))}</h2>
        {selectedList.length === 0 && <p className="card empty">Ingen træninger denne dag.</p>}
        {selectedList.map((s) => (
          <article key={s.id} className={`card training disc disc-${s.discipline}`}>
            <div className="training-time">
              {formatTime(s.startsAt)}–{formatTime(s.endsAt)}
            </div>
            <div>
              <span className="disc-label">{DISCIPLINE_LABEL[s.discipline]}</span>
              <h3 style={s.cancelledAt ? { textDecoration: "line-through" } : undefined}>{s.title}</h3>
              {s.cancelledAt && <p><span className="pill warn">Aflyst{s.cancelReason ? `: ${s.cancelReason}` : ""}</span></p>}
              <p className="muted">
                {s.location}
                {s.createdBy.name ? ` · Træner: ${s.createdBy.name}` : ""}
                {" · "}
                {GROUP_LABEL[s.group]}
              </p>
              {s.description && <p style={{ whiteSpace: "pre-line" }}>{s.description}</p>}
              {isWorkout(s.workout) && <WorkoutView workout={s.workout} discipline={s.discipline} refs={refs} />}
              <Attendees names={s.signups.map((x) => x.user.name ?? "Unavngivet")} count={s.signups.length} />
            </div>
            {userId && !s.cancelledAt && s.startsAt > new Date() && (s.signups.some((x) => x.user.id === userId) || (eligible && canJoinGroup(session!.user, s.group))) && (
              <form action={toggleSignup} className="signup">
                <input type="hidden" name="sessionId" value={s.id} />
                {s.signups.some((x) => x.user.id === userId) ? (
                  <button className="button secondary small" type="submit">✓ Tilmeldt · Afmeld</button>
                ) : (
                  <button className="button small" type="submit">Tilmeld</button>
                )}
              </form>
            )}
          </article>
        ))}
      </section>
    </>
  );
}

// Navne vises kun for indloggede; andre ser kun antallet
function Attendees({ names, count }: { names: string[] | null; count: number }) {
  if (count === 0) return <p className="muted attendees">Ingen tilmeldte endnu</p>;
  return (
    <p className="attendees">
      <strong>{count} kommer</strong>
      {names && <span className="muted">: {names.join(", ")}</span>}
    </p>
  );
}
