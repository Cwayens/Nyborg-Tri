import Link from "next/link";
import type { Discipline } from "@prisma/client";
import { KIND_LABEL, personalTarget, referenceLabel, stepAmount, stepIntensity, totalDuration, type References, type Workout } from "@/lib/workout";
import { formatDuration } from "@/lib/benchmarks";

const MISSING: Partial<Record<Discipline, string>> = {
  BIKE: "FTP-test",
  RUN: "5 eller 10 km-test",
  SWIM: "100 m-test",
};

// Programmet trin for trin med atletens personlige watt eller tempo
export function WorkoutView({ workout, discipline, refs, downloadId }: { workout: Workout; discipline: Discipline; refs: References | null; downloadId?: string }) {
  const total = totalDuration(workout);
  const anyTarget = workout.blocks.some((b) => b.steps.some((s) => personalTarget(discipline, s, refs ?? {})));
  return (
    <details className="workout">
      <summary>
        Se program{total ? ` · ${formatDuration(total)}` : ""}
        {anyTarget && <span className="pill ok">Dine tal</span>}
      </summary>
      <ol>
        {workout.blocks.map((b, i) => (
          <li key={i} className={b.repeat > 1 ? "rep" : undefined}>
            {b.repeat > 1 && <span className="rep-count">{b.repeat} ×</span>}
            <ul>
              {b.steps.map((s, j) => {
                const target = personalTarget(discipline, s, refs ?? {});
                return (
                  <li key={j} className={`step step-${s.kind}`}>
                    <span className="step-kind">{KIND_LABEL[s.kind]}</span>
                    <span className="step-len">{stepAmount(s)}</span>
                    <span className="step-pct">{stepIntensity(s)}</span>
                    {target && <b className="step-target">{target}</b>}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
      <p className="muted workout-note">
        Procent {referenceLabel(discipline)}.{" "}
        {refs && !anyTarget && MISSING[discipline] && (
          <>Gem en <Link href="/benchmarks">{MISSING[discipline]}</Link> fra dit ur under Mine tests, så regner vi dine egne tal ud.</>
        )}
        {!refs && <>Log ind for at se dine egne tal.</>}
      </p>
      {downloadId && (
        <div className="workout-export">
          <span>Læg på uret:</span>
          <a href={`/api/program/${downloadId}?format=fit`} className="button small secondary" download>Hent til ur (.fit)</a>
          {discipline !== "SWIM" && <a href={`/api/program/${downloadId}?format=zwo`} className="button small ghost" download>Zwift (.zwo)</a>}
          <Link href="/program-paa-uret" className="muted">Sådan gør du</Link>
        </div>
      )}
    </details>
  );
}
