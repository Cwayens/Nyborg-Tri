import Link from "next/link";
import { auth } from "@/auth";
import { canSignUp } from "@/lib/access";
import { prisma } from "@/lib/db";
import { disciplineLabel, hasRole } from "@/lib/roles";
import { getLocale, translator, type T } from "@/lib/i18n";
import { dayKey, formatDay, formatTime, isoWeek, parseLocal } from "@/lib/time";
import { setPaceGroup, toggleSignup } from "@/app/kalender/actions";
import { isOn } from "@/lib/features";
import { suggestGroup } from "@/lib/pace";
import { TEST_BY_KEY } from "@/lib/benchmarks";
import { WorkoutView } from "@/components/WorkoutView";
import { isWorkout, referencesFrom } from "@/lib/workout";
import { FROM_WEARABLE } from "@/lib/benchmarks";
import { calendarViewer, getBranches, getTeams, teamsFor } from "@/lib/visibility";
import { canJoinTeam } from "@/lib/teams";
import { deletePlanned } from "@/app/kalender/mit-program/actions";

export type CalendarParams = { gruppe?: string; maaned?: string; dag?: string; afdeling?: string };

const WEEKDAYS = { da: ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"], en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] };
const MONTHS_ALL = {
  da: ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Månedskalender. Medlemmer (/kalender) kan tilmelde sig og se deltagere og program.
 * Besøgende (/traening) ser kun hvornår og hvor, og får "Prøv gratis" i stedet for "Tilmeld".
 */
export async function MonthCalendar({ sp, publicView }: { sp: CalendarParams; publicView: boolean }) {
  const session = publicView ? null : await auth();
  const base = publicView ? "/traening" : "/kalender";
  const viewer = await calendarViewer(session?.user.id);
  const loc = await getLocale();
  const t = translator(loc);
  const MONTHS = MONTHS_ALL[loc];
  const own = viewer?.teamId ?? null;
  // Hvilke hold man må se (eget hold og dem, holdet ser; se visibleTeams). Besøgende ser de åbne hold.
  const [allTeams, branches] = await Promise.all([getTeams(), getBranches()]);
  // Netværk med flere afdelinger: vælg afdeling (?afdeling=), så man kun ser dens hold. Hold uden afdeling vises altid.
  const branch = branches.length > 1 ? branches.find((b) => b.id === sp.afdeling) ?? null : null;
  const allowed = (await teamsFor(viewer?.id)).filter((id) => !branch || [branch.id, null, undefined].includes(allTeams.find((t) => t.id === id)?.branchId));
  const teamName = new Map(allTeams.map((t) => [t.id, branch ? t.name : t.label]));
  // Som standard eget hold; "alle" viser alt, man må se. ?gruppe= tager både hold-id og gammel gruppe (fx ELITE)
  const pick = sp.gruppe === "alle" ? null : sp.gruppe ? (allTeams.find((t) => t.id === sp.gruppe) ?? allTeams.find((t) => t.kind === sp.gruppe && allowed.includes(t.id)))?.id ?? null : own;
  const group: string | null = pick && allowed.includes(pick) && allowed.length > 1 ? pick : null;

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
      where: { startsAt: { gte: parseLocal(`${monthKey}-01T00:00`), lt: parseLocal(`${next}-01T00:00`) }, teamId: { in: group ? [group] : allowed } },
      include: {
        createdBy: { select: { name: true } },
        // Besøgende må ikke se, hvem der kommer
        signups: publicView
          ? { where: { id: "-" }, include: { user: { select: { id: true, name: true } } } }
          : { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { startsAt: "asc" },
    })
  );

  const days = new Map<string, typeof sessions>();
  for (const s of sessions) days.set(dayKey(s.startsAt), [...(days.get(dayKey(s.startsAt)) ?? []), s]);

  const userId = session?.user.id ?? null;
  const [tempo, testdage, ownOn, shareOn] = await Promise.all([isOn("tempo"), isOn("testdage"), isOn("egetprogram"), isOn("traensammen")]);
  // Eget program (importeret fra TrainingPeaks m.fl.): kun for den, der er logget ind
  const planned = userId && ownOn && !publicView
    ? await prisma.plannedWorkout.findMany({ where: { userId, day: { gte: `${monthKey}-01`, lt: `${next}-01` } }, orderBy: [{ day: "asc" }, { time: "asc" }] })
    : [];
  const ownDays = new Map<string, typeof planned>();
  for (const p of planned) ownDays.set(p.day, [...(ownDays.get(p.day) ?? []), p]);
  const eligible = userId ? await canSignUp(userId) : false;
  // Hvem der kommer, er personoplysninger: kun medlemmer og trænere ser navnene, og navne på børnehold
  // ser kun trænere og børnene selv. Alle andre ser kun antallet.
  const trainer = !!session && hasRole(session.user.role, "TRAINER");
  const kindOf = (id: string | null) => allTeams.find((x) => x.id === id)?.kind ?? null;
  const namesVisible = (teamId: string | null) => trainer || (eligible && (kindOf(teamId) !== "BOERN" || kindOf(own) === "BOERN"));
  const refs = userId
    ? referencesFrom(await prisma.benchmarkResult.findMany({ where: { userId, ...FROM_WEARABLE }, select: { test: true, seconds: true, watts: true } }))
    : null;

  // Valgt dag: ?dag=, ellers næste dag med træning fra i dag, ellers første dag med træning i måneden
  const keys = [...new Set([...days.keys(), ...ownDays.keys()])].sort();
  const selected =
    sp.dag?.startsWith(monthKey) ? sp.dag
    : keys.find((k) => k >= todayKey) ?? keys[0] ?? (todayKey.startsWith(monthKey) ? todayKey : `${monthKey}-01`);
  const selectedList = days.get(selected) ?? [];
  const selectedOwn = ownDays.get(selected) ?? [];

  const gq = `gruppe=${group ?? "alle"}${branch ? `&afdeling=${branch.id}` : ""}`;
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
            <h1 style={{ margin: "0 0 4px" }}>{t("Træning", "Training")}</h1>
            <p className="muted" style={{ margin: 0 }}>{t("Her er klubbens træninger. Som medlem tilmelder du dig med ét tryk, og de første 14 dage er gratis.", "Here are the club's trainings. As a member you sign up with one tap, and the first 14 days are free.")}</p>
          </div>
          <Link href="/bliv-medlem" className="button">{t("Prøv gratis i 14 dage", "Try free for 14 days")}</Link>
        </div>
      ) : (
        <div className="section-head" style={{ marginTop: 0 }}>
          <h1 style={{ margin: 0 }}>{t("Kalender", "Calendar")}</h1>
          <span className="cal-links">
            {ownOn && <Link href="/kalender/mit-program" className="button small secondary">{t("+ Importér eget program", "+ Import your own plan")}</Link>}
            <Link href="/forbindelser" className="muted">{t("Få kalenderen på telefonen →", "Get the calendar on your phone →")}</Link>
          </span>
        </div>
      )}
      {branches.length > 1 && <p className="filters">
        <span className="muted">{t("Afdeling:", "Branch:")}</span>
        <Link href={`${base}?gruppe=alle&maaned=${monthKey}`} className={!branch ? "active" : undefined}>{t("Alle", "All")}</Link>
        {branches.map((b) => (
          <Link key={b.id} href={`${base}?gruppe=alle&afdeling=${b.id}&maaned=${monthKey}`} className={branch?.id === b.id ? "active" : undefined}>{b.name}</Link>
        ))}
      </p>}
      {allowed.length > 1 && <p className="filters">
        <span className="muted">{t("Vis:", "Show:")}</span>
        <Link href={`${base}?gruppe=alle&maaned=${monthKey}${branch ? `&afdeling=${branch.id}` : ""}`} className={group === null ? "active" : undefined}>{t("Alle", "All")}</Link>
        {allowed.map((g) => (
          <Link key={g} href={`${base}?gruppe=${g}&maaned=${monthKey}${branch ? `&afdeling=${branch.id}` : ""}`} className={group === g ? "active" : undefined}>
            {teamName.get(g)}{own === g ? t(" (mit hold)", " (my team)") : ""}
          </Link>
        ))}
      </p>}

      {!eligible && !publicView && (
        <p className="card">
          {t("Du kan tilmelde dig træninger, når du har betalt kontingent, fået en prøveperiode eller brugt en kode.", "You can sign up for trainings once you've paid your fee, got a trial or used a code.")}{" "}
          <Link href="/bliv-medlem">{t("Se mulighederne", "See the options")}</Link>
        </p>
      )}
      {eligible && !own && viewer?.role === "ATHLETE" && (
        <p className="card">{t("Du er endnu ikke tilknyttet et hold. Kontakt bestyrelsen, så du kan tilmelde dig træninger.", "You're not on a team yet. Contact the board so you can sign up for trainings.")}</p>
      )}

      <section className="month card" aria-label={`${MONTHS[m - 1]} ${y}`}>
        <header className="month-head">
          <Link href={url(prev)} className="button ghost small" aria-label={t("Forrige måned", "Previous month")}>‹</Link>
          <h2>{MONTHS[m - 1].replace(/^./, (c) => c.toUpperCase())} {y}</h2>
          <Link href={url(next)} className="button ghost small" aria-label={t("Næste måned", "Next month")}>›</Link>
          {!todayKey.startsWith(monthKey) && <Link href={url(todayKey.slice(0, 7), todayKey)} className="month-today">{t("I dag", "Today")}</Link>}
        </header>
        <div className="month-grid">
          <div className="month-wd month-wk" aria-hidden="true">{t("Uge", "Wk")}</div>
          {WEEKDAYS[loc].map((d) => <div key={d} className="month-wd" aria-hidden="true">{d}</div>)}
          {cells.flatMap((key, i) => {
            // Ugenummer først i hver række (ISO, som i danske kalendere)
            const row = cells.slice(i - (i % 7), i - (i % 7) + 7).find(Boolean)!;
            const wk = i % 7 === 0 ? [<div key={`w${i}`} className="month-wk" aria-hidden="true">{isoWeek(row)}</div>] : [];
            if (!key) return [...wk, <div key={`x${i}`} className="month-cell empty" />];
            const list = days.get(key) ?? [];
            const ownList = ownDays.get(key) ?? [];
            // Højst tre linjer pr. dag; eget program får mindst én plads
            const clubN = Math.min(list.length, ownList.length ? 2 : 3), ownN = Math.min(ownList.length, 3 - clubN), more = list.length + ownList.length - clubN - ownN;
            const mine = userId ? list.some((s) => s.signups.some((x) => x.user.id === userId)) : false;
            const cls = ["month-cell", key === todayKey && "today", key === selected && "selected", key < todayKey && "past", mine && "mine"].filter(Boolean).join(" ");
            return [
              ...wk,
              <Link key={key} href={url(monthKey, key)} className={cls} aria-current={key === selected ? "date" : undefined} scroll={false}
                aria-label={loc === "en"
                  ? `${Number(key.slice(8))} ${MONTHS[m - 1]}: ${list.length ? `${list.length} training${list.length > 1 ? "s" : ""}` : "no trainings"}${ownList.length ? `, ${ownList.length} in your own plan` : ""}`
                  : `${Number(key.slice(8))}. ${MONTHS[m - 1]}: ${list.length ? `${list.length} træning${list.length > 1 ? "er" : ""}` : "ingen træninger"}${ownList.length ? `, ${ownList.length} i dit eget program` : ""}`}>
                <span className="month-num">{Number(key.slice(8))}</span>
                <span className="month-items">
                  {list.slice(0, clubN).map((s) => (
                    <span key={s.id} className={`month-item disc disc-${s.discipline}${s.cancelledAt ? " cancelled" : ""}`}>
                      <i />{formatTime(s.startsAt, loc)} {s.title}
                    </span>
                  ))}
                  {ownList.slice(0, ownN).map((p) => (
                    <span key={p.id} className={`month-item own disc disc-${p.discipline}`}><i />{p.time ? `${p.time} ` : ""}{p.title}</span>
                  ))}
                  {more > 0 && <span className="month-more">+{more} {t("mere", "more")}</span>}
                </span>
                <span className="month-dots" aria-hidden="true">
                  {list.slice(0, 4).map((s) => <i key={s.id} className={`disc disc-${s.discipline}${s.cancelledAt ? " cancelled" : ""}`} />)}
                  {ownList.slice(0, Math.max(0, 4 - list.length)).map((p) => <i key={p.id} className={`own disc disc-${p.discipline}`} />)}
                </span>
              </Link>,
            ];
          })}
        </div>
      </section>

      <section className="day" id="dag">
        <h2>{formatDay(parseLocal(`${selected}T12:00`), loc)}</h2>
        {selectedList.length === 0 && selectedOwn.length === 0 && <p className="card empty">{t("Ingen træninger denne dag.", "No trainings this day.")}</p>}
        {selectedOwn.map((p) => (
          <article key={p.id} className={`card training own disc disc-${p.discipline}`}>
            <div className="training-time">{p.time ?? t("Hele dagen", "All day")}</div>
            <div>
              <span className="own-label">{t("Dit eget program · kun du kan se det", "Your own plan · only you can see it")}</span>
              <h3>{p.title}</h3>
              <p className="muted">{disciplineLabel(p.discipline, loc)}{p.durationMin ? ` · ${p.durationMin} min` : ""}{p.sharedId ? t(" · delt i Træn sammen", " · shared in Train together") : ""}</p>
              {p.description && <p style={{ whiteSpace: "pre-line" }}>{p.description}</p>}
              {isWorkout(p.workout) && <WorkoutView workout={p.workout} discipline={p.discipline} refs={refs} downloadId={p.id} kind="eget" />}
            </div>
            <div className="signup item-actions">
              {shareOn && !p.sharedId && p.day >= todayKey && <Link href={`/traen-sammen?ny=1&fra=${p.id}`} className="button small">{t("Del i Træn sammen", "Share in Train together")}</Link>}
              {p.sharedId && <Link href="/traen-sammen" className="button small secondary">{t("Se turen", "See the session")}</Link>}
              <form action={deletePlanned}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="back" value={url(monthKey, selected)} />
                <button className="button small ghost" type="submit">{t("Slet", "Delete")}</button>
              </form>
            </div>
          </article>
        ))}
        {selectedList.map((s) => (
          <article key={s.id} className={`card training disc disc-${s.discipline}`}>
            <div className="training-time">
              {formatTime(s.startsAt, loc)}–{formatTime(s.endsAt, loc)}
            </div>
            <div>
              <span className="disc-label">{disciplineLabel(s.discipline, loc)}</span>
              {testdage && s.testDay && <span className="pill test-pill">{t("Testdag", "Test day")}: {TEST_BY_KEY[s.testDay].label}</span>}
              <h3 style={s.cancelledAt ? { textDecoration: "line-through" } : undefined}>{s.title}</h3>
              {s.cancelledAt && <p><span className="pill warn">{t("Aflyst", "Cancelled")}{s.cancelReason ? `: ${s.cancelReason}` : ""}</span></p>}
              <p className="muted">
                {s.location}
                {s.createdBy.name && !publicView ? ` · ${t("Træner", "Coach")}: ${s.createdBy.name}` : ""}
                {" · "}
                {teamName.get(s.teamId ?? "")}
              </p>
              {s.description && <p style={{ whiteSpace: "pre-line" }}>{s.description}</p>}
              {!publicView && isWorkout(s.workout) && (
                <WorkoutView workout={s.workout} discipline={s.discipline} refs={refs} downloadId={s.signups.some((x) => x.user.id === userId) ? s.id : undefined} />
              )}
              {!publicView && tempo && s.paceGroups.length > 0 && namesVisible(s.teamId) ? (
                <PaceAttendees t={t} groups={s.paceGroups} signups={s.signups.map((x) => ({ name: x.user.name ?? t("Unavngivet", "Unnamed"), pace: x.paceGroup }))} />
              ) : (
                !publicView && <Attendees t={t} names={namesVisible(s.teamId) ? s.signups.map((x) => x.user.name ?? t("Unavngivet", "Unnamed")) : null} count={s.signups.length} />
              )}
              {!publicView && tempo && s.paceGroups.length > 0 && s.signups.some((x) => x.user.id === userId) && s.startsAt > new Date() && (
                <form action={setPaceGroup} className="pace-change">
                  <input type="hidden" name="sessionId" value={s.id} />
                  <label>{t("Din gruppe", "Your group")}
                    <select name="paceGroup" defaultValue={s.signups.find((x) => x.user.id === userId)?.paceGroup ?? ""}>
                      <option value="">{t("Ved ikke endnu", "Not sure yet")}</option>
                      {s.paceGroups.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </label>
                  <button className="button small ghost" type="submit">{t("Skift", "Change")}</button>
                </form>
              )}
            </div>
            {publicView && !s.cancelledAt && s.startsAt > new Date() && (
              <Link href="/bliv-medlem" className="button small secondary signup">{t("Prøv gratis", "Try free")}</Link>
            )}
            {userId && !s.cancelledAt && s.startsAt > new Date() && (s.signups.some((x) => x.user.id === userId) || (eligible && viewer && canJoinTeam(viewer, s.teamId, allTeams, viewer.trial))) && (
              <form action={toggleSignup} className="signup">
                <input type="hidden" name="sessionId" value={s.id} />
                {s.signups.some((x) => x.user.id === userId) ? (
                  <button className="button secondary small" type="submit">{t("✓ Tilmeldt · Afmeld", "✓ Signed up · Cancel")}</button>
                ) : (
                  <>
                    {tempo && s.paceGroups.length > 0 && (
                      <select name="paceGroup" aria-label={t("Vælg tempogruppe", "Choose pace group")} defaultValue={suggestGroup(s.paceGroups, refs ?? {}, s.discipline) ?? ""}>
                        <option value="">{t("Vælg tempo", "Choose pace")}</option>
                        {s.paceGroups.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    )}
                    <button className="button small" type="submit">{t("Tilmeld", "Sign up")}</button>
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
function PaceAttendees({ t, groups, signups }: { t: T; groups: string[]; signups: { name: string; pace: string | null }[] }) {
  if (signups.length === 0) return <p className="muted attendees">{t("Ingen tilmeldte endnu. Vælg din tempogruppe, når du tilmelder dig.", "No one signed up yet. Choose your pace group when you sign up.")}</p>;
  const rows = [...groups, null].map((g) => ({ g, names: signups.filter((x) => (g ? x.pace === g : !x.pace || !groups.includes(x.pace))).map((x) => x.name) }));
  return (
    <div className="attendees pace-groups">
      <strong>{signups.length} {t("kommer", "coming")}</strong>
      <ul>
        {rows.filter((r) => r.g || r.names.length).map((r) => (
          <li key={r.g ?? "-"}><span className="pill">{r.g ?? t("Ingen gruppe", "No group")}</span> {r.names.length ? <span className="muted">{r.names.join(", ")}</span> : <span className="muted">{t("Ingen endnu", "None yet")}</span>}</li>
        ))}
      </ul>
    </div>
  );
}

// Navne vises kun for medlemmer (se namesVisible); andre ser kun antallet
function Attendees({ t, names, count }: { t: T; names: string[] | null; count: number }) {
  if (count === 0) return <p className="muted attendees">{t("Ingen tilmeldte endnu", "No one signed up yet")}</p>;
  return (
    <p className="attendees">
      <strong>{count} {t("kommer", "coming")}</strong>
      {names && <span className="muted">: {names.join(", ")}</span>}
    </p>
  );
}
