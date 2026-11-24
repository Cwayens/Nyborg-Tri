import Link from "next/link";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { requireFeature } from "@/lib/features";
import { referencesFor } from "@/lib/program-upload";
import { parseText } from "@/lib/workout";
import { DISCIPLINE_LABEL } from "@/lib/roles";
import { BEGINNER_PLAN, PLAN_SESSIONS, RACE_CHECKLIST } from "@/data/begynder";
import { DisciplineIcon } from "@/components/Icons";
import { WorkoutView } from "@/components/WorkoutView";
import { dato } from "@/lib/format";
import { startPlan, stopPlan, toggleDone } from "./actions";

export const metadata = { title: "Fra 0 til første triatlon" };

const WEEK = 7 * 24 * 3600 * 1000;

function nextMonday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

export default async function Beginner() {
  const user = await requireUser("/begynder");
  await requireFeature("begynder");
  const [plan, refs] = await Promise.all([prisma.beginnerPlan.findUnique({ where: { userId: user.id } }), referencesFor(user.id)]);
  const current = plan ? Math.min(10, Math.max(1, Math.floor((Date.now() - plan.startedAt.getTime()) / WEEK) + 1)) : 0;
  const notYet = plan && plan.startedAt.getTime() > Date.now();
  const done = new Set(plan?.done ?? []);
  const pct = Math.round((done.size / PLAN_SESSIONS.length) * 100);

  return (
    <>
      <h1>Fra 0 til første triatlon</h1>
      <p className="muted" style={{ marginTop: -8, maxWidth: 720 }}>
        Et 10-ugers forløb mod en sprint: 750 m svøm, 20 km cykel og 5 km løb. Tre korte træninger om ugen, som du kan hente til uret.
        Tempoet regnes ud fra dine egne tests, så det passer til dig, uanset hvor du starter.
      </p>

      {!plan ? (
        <form action={startPlan} className="card begin-start">
          <div>
            <h2 className="h3" style={{ margin: 0 }}>Klar til at starte?</h2>
            <p className="muted" style={{ margin: "4px 0 0" }}>Vælg en startdato. Du kan altid starte forfra eller stoppe igen.</p>
          </div>
          <label>Start<input type="date" name="start" defaultValue={nextMonday()} required /></label>
          <button className="button" type="submit">Start forløbet</button>
        </form>
      ) : (
        <section className="card begin-status">
          <div>
            <b>{notYet ? `Starter ${dato(plan.startedAt)}` : `Uge ${current} af 10`}</b>
            <span className="muted"> · {done.size} af {PLAN_SESSIONS.length} træninger gennemført</span>
          </div>
          <div className="meter" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Gennemført"><i style={{ width: `${pct}%` }} /></div>
          <form action={stopPlan}><button className="linklike" type="submit">Stop forløbet</button></form>
        </section>
      )}

      {!refs.ftp && !refs.thresholdPace && (
        <p className="notice">Tip: Forbind dit ur og gem en test under <Link href="/benchmarks">Mine tests</Link>, så viser programmerne dine egne watt og tempoer.</p>
      )}

      <div className="begin-weeks">
        {BEGINNER_PLAN.map((wk) => {
          const isNow = plan && !notYet && wk.week === current;
          const wkDone = wk.sessions.filter((s) => done.has(s.id)).length;
          return (
            <details key={wk.week} className={`card begin-week${isNow ? " now" : ""}`} open={!!isNow || (!plan && wk.week === 1)}>
              <summary>
                <span className="begin-num">Uge {wk.week}</span>
                <b>{wk.theme}</b>
                {plan && <span className={`pill${wkDone === wk.sessions.length ? " ok" : ""}`}>{wkDone}/{wk.sessions.length}</span>}
                {isNow && <span className="pill test-pill">Denne uge</span>}
              </summary>
              <p className="begin-tip">💡 {wk.tip}</p>
              {wk.sessions.map((s) => (
                <div key={s.id} className={`begin-session disc disc-${s.discipline}`}>
                  <div className="begin-head">
                    <DisciplineIcon discipline={s.discipline} />
                    <div>
                      <span className="disc-label">{DISCIPLINE_LABEL[s.discipline]}</span>
                      <h3>{s.title}</h3>
                      {s.note && <p className="muted" style={{ margin: 0 }}>{s.note}</p>}
                    </div>
                    {plan && (
                      <form action={toggleDone}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className={`button small ${done.has(s.id) ? "secondary" : "ghost"}`} type="submit">{done.has(s.id) ? "✓ Gennemført" : "Marker gennemført"}</button>
                      </form>
                    )}
                  </div>
                  <WorkoutView workout={parseText(s.program)} discipline={s.discipline} refs={refs} downloadId={s.id} kind="forloeb" />
                </div>
              ))}
            </details>
          );
        })}
      </div>

      <section className="card" style={{ marginTop: 24 }}>
        <h2 className="h3" style={{ marginTop: 0 }}>Tjekliste til dit første stævne</h2>
        <ul className="begin-checklist">
          {RACE_CHECKLIST.map((c) => (
            <li key={c.id}>
              {plan ? (
                <form action={toggleDone}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="list" value="checklist" />
                  <button type="submit" className="check-btn" aria-pressed={plan.checklist.includes(c.id)}>
                    <span aria-hidden="true">{plan.checklist.includes(c.id) ? "☑" : "☐"}</span> {c.text}
                  </button>
                </form>
              ) : <span>☐ {c.text}</span>}
            </li>
          ))}
        </ul>
        <p className="muted" style={{ marginBottom: 0 }}>Find et stævne og klubkammerater, der også skal med, under <Link href="/staevner">Stævner</Link>.</p>
      </section>
    </>
  );
}
