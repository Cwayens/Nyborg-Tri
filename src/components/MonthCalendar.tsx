import Link from "next/link";
import type { AthleteGroup } from "@prisma/client";
import { auth } from "@/auth";
import { canSignUp } from "@/lib/access";
import { prisma } from "@/lib/db";
import { DISCIPLINE_LABEL, GROUP_LABEL, GROUPS, canJoinGroup, hasRole, trainingVisibleFor } from "@/lib/roles";
import { dayKey, formatDay, formatTime, parseLocal } from "@/lib/time";
import { setPaceGroup, toggleSignup } from "@/app/kalender/actions";
import { isOn } from "@/lib/features";
import { suggestGroup } from "@/lib/pace";
import { TEST_BY_KEY } from "@/lib/benchmarks";
import { WorkoutView } from "@/components/WorkoutView";
import { isWorkout, referencesFrom } from "@/lib/workout";
import { FROM_WEARABLE } from "@/lib/benchmarks";

export type CalendarParams = { gruppe?: string; maaned?: string; dag?: string };

const WEEKDAYS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
const MONTHS = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Månedskalender. Medlemmer (/kalender) kan tilmelde sig og se deltagere og program.
 * Besøgende (/traening) ser kun hvornår og hvor, og får "Prøv gratis" i stedet for "Tilmeld".
 */
export async function MonthCalendar({ sp, publicView }: { sp: CalendarParams; publicView: boolean }) {
  const session = publicView ? null : await auth();
  const base = publicView ? "/traening" : "/kalender";
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
        // Besøgende må ikke se, hvem der kommer
        signups: publicView
          ? { where: { id: "-" }, include: { user: { select: { id: true, name: true } } } }
          : { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { startsAt: "asc" },
    })
  ).filter((s) => trainingVisibleFor(s.group, group));

  const days = new Map<string, typeof sessions>();
  for (const s of sessions) days.set(dayKey(s.startsAt), [...(days.get(dayKey(s.startsAt)) ?? []), s]);

  const userId = session?.user.id ?? null;
  const [tempo, testdage] = await Promise.all([isOn("tempo"), isOn("testdage")]);
  const eligible = userId ? await canSignUp(userId) : false;
  // Hvem der kommer, er personoplysninger: kun medlemmer og trænere ser navnene, og navne på børnehold
  // ser kun trænere og børnene selv. Alle andre ser kun antallet.
  const trainer = !!session && hasRole(session.user.role, "TRAINER");
  const namesVisible = (g: AthleteGroup) => trainer || (eligible && (g !== "BOERN" || own === "BOERN"));
  const refs = userId
    ? referencesFrom(await prisma.benchmarkResult.findMany({ where: { userId, ...FROM_WEARABLE }, select: { test: true, seconds: true, watts: true } }))
    : null;

  // Valgt dag: ?dag=, ellers næste dag med træning fra i dag, ellers første dag med træning i måneden
  const keys = [...days.keys()];
  const selected =
    sp.dag?.startsWith(monthKey) ? sp.dag
    : keys.find((k) => k >= todayKey) ?? keys[0] ?? (todayKey.startsWith(monthKey) ? todayKey : `${monthKey}-01`);
  const selectedList = days.get(selected) ?? [];

  const gq = `gruppe=${group ?? "alle"}`;
  const url = (month: string, day?: string) => `${base}?${gq}&maaned=${month}${day ? `&dag=${day}` : ""}`;
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${monthKey}-${pad(i + 1)}`),
  ];
  while (cells.length % 7) cells.push(null);

  return (
    <>
      {publicView ? (
        <div className="section-head" style={{ marginTop: 0 }}>
          <div>
            <h1 style={{ margin: "0 0 4px" }}>Træning</h1>
            <p className="muted" style={{ margin: 0 }}>Her er klubbens træninger. Som medlem tilmelder du dig med ét tryk, og de første 14 dage er gratis.</p>
          </div>
          <Link href="/bliv-medlem" className="button">Prøv gratis i 14 dage</Link>
        </div>
      ) : (
        <div className="section-head" style={{ marginTop: 0 }}>
          <h1 style={{ margin: 0 }}>Kalender</h1>
          <Link href="/forbindelser" className="muted">Få kalenderen på telefonen →</Link>
        </div>
      )}
      <p className="filters">
        <span className="muted">Vis:</span>
        <Link href={`${base}?gruppe=alle&maaned=${monthKey}`} className={group === null ? "active" : undefined}>Alle</Link>
        {GROUPS.map((g) => (
          <Link key={g} href={`${base}?gruppe=${g}&maaned=${monthKey}`} className={group === g ? "active" : undefined}>
            {GROUP_LABEL[g]}{own === g ? " (min gruppe)" : ""}
          </Link>
        ))}
      </p>

      {!eligible && !publicView && (
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
        <div className="month-grid">
          {WEEKDAYS.map((d) => <div key={d} className="month-wd" aria-hidden="true">{d}</div>)}
          {cells.map((key, i) => {
            if (!key) return <div key={`x${i}`} className="month-cell empty" />;
            const list = days.get(key) ?? [];
            const mine = userId ? list.some((s) => s.signups.some((x) => x.user.id === userId)) : false;
            const cls = ["month-cell", key === todayKey && "today", key === selected && "selected", key < todayKey && "past", mine && "mine"].filter(Boolean).join(" ");
            return (
              <Link key={key} href={url(monthKey, key)} className={cls} aria-current={key === selected ? "date" : undefined} scroll={false}
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
              {testdage && s.testDay && <span className="pill test-pill">Testdag: {TEST_BY_KEY[s.testDay].label}</span>}
              <h3 style={s.cancelledAt ? { textDecoration: "line-through" } : undefined}>{s.title}</h3>
              {s.cancelledAt && <p><span className="pill warn">Aflyst{s.cancelReason ? `: ${s.cancelReason}` : ""}</span></p>}
              <p className="muted">
                {s.location}
                {s.createdBy.name && !publicView ? ` · Træner: ${s.createdBy.name}` : ""}
                {" · "}
                {GROUP_LABEL[s.group]}
              </p>
              {s.description && <p style={{ whiteSpace: "pre-line" }}>{s.description}</p>}
              {!publicView && isWorkout(s.workout) && (
                <WorkoutView workout={s.workout} discipline={s.discipline} refs={refs} downloadId={s.signups.some((x) => x.user.id === userId) ? s.id : undefined} />
              )}
              {!publicView && tempo && s.paceGroups.length > 0 && namesVisible(s.group) ? (
                <PaceAttendees groups={s.paceGroups} signups={s.signups.map((x) => ({ name: x.user.name ?? "Unavngivet", pace: x.paceGroup }))} />
              ) : (
                !publicView && <Attendees names={namesVisible(s.group) ? s.signups.map((x) => x.user.name ?? "Unavngivet") : null} count={s.signups.length} />
              )}
              {!publicView && tempo && s.paceGroups.length > 0 && s.signups.some((x) => x.user.id === userId) && s.startsAt > new Date() && (
                <form action={setPaceGroup} className="pace-change">
                  <input type="hidden" name="sessionId" value={s.id} />
                  <label>Din gruppe
                    <select name="paceGroup" defaultValue={s.signups.find((x) => x.user.id === userId)?.paceGroup ?? ""}>
                      <option value="">Ved ikke endnu</option>
                      {s.paceGroups.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </label>
                  <button className="button small ghost" type="submit">Skift</button>
                </form>
              )}
            </div>
            {publicView && !s.cancelledAt && s.startsAt > new Date() && (
              <Link href="/bliv-medlem" className="button small secondary signup">Prøv gratis</Link>
            )}
            {userId && !s.cancelledAt && s.startsAt > new Date() && (s.signups.some((x) => x.user.id === userId) || (eligible && canJoinGroup(session!.user, s.group))) && (
              <form action={toggleSignup} className="signup">
                <input type="hidden" name="sessionId" value={s.id} />
                {s.signups.some((x) => x.user.id === userId) ? (
                  <button className="button secondary small" type="submit">✓ Tilmeldt · Afmeld</button>
                ) : (
                  <>
                    {tempo && s.paceGroups.length > 0 && (
                      <select name="paceGroup" aria-label="Vælg tempogruppe" defaultValue={suggestGroup(s.paceGroups, refs ?? {}, s.discipline) ?? ""}>
                        <option value="">Vælg tempo</option>
                        {s.paceGroups.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    )}
                    <button className="button small" type="submit">Tilmeld</button>
                  </>
                )}
              </form>
            )}
          </article>
        ))}
      </section>
    </>
  );
}

// Tilmeldte fordelt på tempogrupper
function PaceAttendees({ groups, signups }: { groups: string[]; signups: { name: string; pace: string | null }[] }) {
  if (signups.length === 0) return <p className="muted attendees">Ingen tilmeldte endnu. Vælg din tempogruppe, når du tilmelder dig.</p>;
  const rows = [...groups, null].map((g) => ({ g, names: signups.filter((x) => (g ? x.pace === g : !x.pace || !groups.includes(x.pace))).map((x) => x.name) }));
  return (
    <div className="attendees pace-groups">
      <strong>{signups.length} kommer</strong>
      <ul>
        {rows.filter((r) => r.g || r.names.length).map((r) => (
          <li key={r.g ?? "-"}><span className="pill">{r.g ?? "Ingen gruppe"}</span> {r.names.length ? <span className="muted">{r.names.join(", ")}</span> : <span className="muted">Ingen endnu</span>}</li>
        ))}
      </ul>
    </div>
  );
}

// Navne vises kun for medlemmer (se namesVisible); andre ser kun antallet
function Attendees({ names, count }: { names: string[] | null; count: number }) {
  if (count === 0) return <p className="muted attendees">Ingen tilmeldte endnu</p>;
  return (
    <p className="attendees">
      <strong>{count} kommer</strong>
      {names && <span className="muted">: {names.join(", ")}</span>}
    </p>
  );
}
