import type { Discipline } from "@prisma/client";
import { DISCIPLINE_LABEL } from "@/lib/roles";

// Stablet søjlediagram: timer pr. uge fordelt på sport. Ren CSS, ingen JS.
export type WeekData = { label: string; bySport: Partial<Record<Discipline, number>> };

const ORDER: Discipline[] = ["SWIM", "BIKE", "RUN", "STRENGTH", "OTHER"];

export function WeekChart({ weeks }: { weeks: WeekData[] }) {
  const max = Math.max(1, ...weeks.map((w) => Object.values(w.bySport).reduce((s, v) => s + (v ?? 0), 0)));
  const used = ORDER.filter((s) => weeks.some((w) => w.bySport[s]));
  return (
    <figure style={{ margin: 0 }}>
      <div className="weekbars" style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }} role="img"
        aria-label={weeks.map((w) => `${w.label}: ${(Object.values(w.bySport).reduce((s, v) => s + (v ?? 0), 0) / 3600).toFixed(1)} timer`).join(", ")}>
        {weeks.map((w) => {
          const total = Object.values(w.bySport).reduce((s, v) => s + (v ?? 0), 0);
          return (
            <div key={w.label} title={`${w.label}: ${(total / 3600).toFixed(1)} t`}>
              {ORDER.map((s) => w.bySport[s] ? (
                <span key={s} className={`seg disc disc-${s}`} style={{ height: `${((w.bySport[s] ?? 0) / max) * 100}%` }} />
              ) : null)}
              <small>{w.label}</small>
            </div>
          );
        })}
      </div>
      {used.length > 0 && (
        <figcaption className="legend">
          {used.map((s) => <span key={s} className={`disc disc-${s}`}><i />{DISCIPLINE_LABEL[s]}</span>)}
        </figcaption>
      )}
    </figure>
  );
}
