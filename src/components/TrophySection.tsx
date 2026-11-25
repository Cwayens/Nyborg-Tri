import { prisma } from "@/lib/db";
import { isOn } from "@/lib/features";
import { LEVELS, levelText, rank, trophies, type Done } from "@/lib/trophies";
import { translator, type Locale } from "@/lib/i18n-core";

// Din titel og dine mærker på Min side. Bygger kun på klubtræninger og Træn sammen-ture, og vises kun for dig selv.
export async function TrophySection({ userId, loc = "da" }: { userId: string; loc?: Locale }) {
  const t = translator(loc);
  const many = (n: number) => (loc === "en" ? (n === 1 ? "training" : "trainings") : n === 1 ? "træning" : "træninger");
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
  const list = trophies(done, loc);
  const lv = r.level ? levelText(r.level, loc) : null;
  const earned = list.filter((x) => x.earned).length;
  return (
    <section className="card trophy-card" style={{ marginTop: 18 }}>
      <div className="trophy-head">
        <Medal level={r.level ? LEVELS.indexOf(r.level) + 1 : 0} />
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>{t("Din titel", "Your title")}</p>
          <h2 style={{ margin: "2px 0 4px" }}>{lv?.title ?? t("Klar til start", "Ready to start")}</h2>
          <p className="muted" style={{ margin: 0 }}>{lv?.text ?? t("Tag med til din første træning, og få din første titel.", "Join your first training and get your first title.")}</p>
        </div>
      </div>
      <p className="trophy-count">
        <b>{r.count}</b> {many(r.count)} {t("med klubben", "with the club")}
        {r.next && <span className="muted"> · {r.toNext} {t("til", "to")} <b>{levelText(r.next, loc).title}</b></span>}
      </p>
      {r.next && <div className="meter" role="progressbar" aria-valuenow={r.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${t("Fremgang mod", "Progress to")} ${levelText(r.next, loc).title}`}><i style={{ width: `${r.pct}%` }} /></div>}
      <h3 className="trophy-sub">{t("Mærker", "Badges")} <span className="muted">{earned} {t("af", "of")} {list.length}</span></h3>
      <ul className="trophy-grid">
        {list.map((x) => (
          <li key={x.key} className={x.earned ? "earned" : ""} title={x.text}>
            <span className="trophy-icon" aria-hidden="true">{x.earned ? "★" : "☆"}</span>
            <strong>{x.title}</strong>
            <span className="muted">{x.text}</span>
            <span className="trophy-progress">{x.earned ? t("Klaret", "Done") : x.progress}</span>
          </li>
        ))}
      </ul>
      <details className="trophy-all">
        <summary>{t("Se alle titler", "See all titles")}</summary>
        <ol>
          {LEVELS.map((l) => (
            <li key={l.at} className={r.count >= l.at ? "earned" : ""}><b>{levelText(l, loc).title}</b> <span className="muted">{l.at} {many(l.at)}</span></li>
          ))}
        </ol>
      </details>
      <p className="muted small" style={{ marginBottom: 0 }}>{t("Tæller klubtræninger, du var tilmeldt, og ture under Træn sammen. Kun du kan se dine mærker.", "Counts club trainings you signed up for and Train together sessions. Only you can see your badges.")}</p>
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
