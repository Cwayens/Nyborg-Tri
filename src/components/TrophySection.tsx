import { prisma } from "@/lib/db";
import { isOn } from "@/lib/features";
import { LEVELS, rank, trophies, type Done } from "@/lib/trophies";

// Din titel og dine mærker på Min side. Bygger kun på klubtræninger og Træn sammen-ture, og vises kun for dig selv.
export async function TrophySection({ userId }: { userId: string }) {
  if (!(await isOn("maerker"))) return null;
  const now = new Date();
  const [signups, joined, hosted] = await Promise.all([
    prisma.trainingSignup.findMany({
      where: { userId, session: { startsAt: { lt: now }, cancelledAt: null } },
      select: { session: { select: { startsAt: true, discipline: true } } },
    }),
    prisma.groupWorkoutParticipant.findMany({ where: { userId, workout: { startsAt: { lt: now } } }, select: { workout: { select: { startsAt: true, discipline: true } } } }),
    prisma.groupWorkout.findMany({ where: { hostId: userId, startsAt: { lt: now } }, select: { startsAt: true, discipline: true } }),
  ]);
  const done: Done[] = [
    ...signups.map((s) => ({ at: s.session.startsAt, discipline: s.session.discipline })),
    ...joined.map((j) => ({ at: j.workout.startsAt, discipline: j.workout.discipline })),
    ...hosted.map((h) => ({ at: h.startsAt, discipline: h.discipline, host: true })),
  ];
  const r = rank(done.length);
  const list = trophies(done);
  const earned = list.filter((t) => t.earned).length;
  return (
    <section className="card trophy-card" style={{ marginTop: 18 }}>
      <div className="trophy-head">
        <Medal level={r.level ? LEVELS.indexOf(r.level) + 1 : 0} />
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>Din titel</p>
          <h2 style={{ margin: "2px 0 4px" }}>{r.level?.title ?? "Klar til start"}</h2>
          <p className="muted" style={{ margin: 0 }}>{r.level?.text ?? "Tag med til din første træning, og få din første titel."}</p>
        </div>
      </div>
      <p className="trophy-count">
        <b>{r.count}</b> {r.count === 1 ? "træning" : "træninger"} med klubben
        {r.next && <span className="muted"> · {r.toNext} til <b>{r.next.title}</b></span>}
      </p>
      {r.next && <div className="meter" role="progressbar" aria-valuenow={r.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Fremgang mod ${r.next.title}`}><i style={{ width: `${r.pct}%` }} /></div>}
      <h3 className="trophy-sub">Mærker <span className="muted">{earned} af {list.length}</span></h3>
      <ul className="trophy-grid">
        {list.map((t) => (
          <li key={t.key} className={t.earned ? "earned" : ""} title={t.text}>
            <span className="trophy-icon" aria-hidden="true">{t.earned ? "★" : "☆"}</span>
            <strong>{t.title}</strong>
            <span className="muted">{t.text}</span>
            <span className="trophy-progress">{t.earned ? "Klaret" : t.progress}</span>
          </li>
        ))}
      </ul>
      <details className="trophy-all">
        <summary>Se alle titler</summary>
        <ol>
          {LEVELS.map((l) => (
            <li key={l.at} className={r.count >= l.at ? "earned" : ""}><b>{l.title}</b> <span className="muted">{l.at} {l.at === 1 ? "træning" : "træninger"}</span></li>
          ))}
        </ol>
      </details>
      <p className="muted small" style={{ marginBottom: 0 }}>Tæller klubtræninger, du var tilmeldt, og ture under Træn sammen. Kun du kan se dine mærker.</p>
    </section>
  );
}

function Medal({ level }: { level: number }) {
  return (
    <svg className={`medal${level ? "" : " none"}`} width="56" height="64" viewBox="0 0 56 64" aria-hidden="true">
      <path d="M16 0h10l6 18H22zM40 0H30l-6 18h10z" fill="var(--club-green)" />
      <circle cx="28" cy="40" r="22" fill="var(--accent)" />
      <circle cx="28" cy="40" r="17" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="2" />
      <text x="28" y="47" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff">{level || "–"}</text>
    </svg>
  );
}
