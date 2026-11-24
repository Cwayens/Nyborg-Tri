import type { Discipline } from "@prisma/client";
import { DISCIPLINE_LABEL } from "@/lib/roles";
import { DisciplineIcon } from "./Icons";

// Træning pr. disciplin: én række pr. sport med timer denne uge, snit for de forrige uger og små søjler pr. uge.
// Alle rækker bruger samme skala, så søjlerne kan sammenlignes på tværs. Ren CSS, ingen JS; tooltip ved hover/fokus.
export type WeekData = {
  label: string;
  from: Date;
  bySport: Partial<Record<Discipline, number>>; // sekunder
  meters: Partial<Record<Discipline, number>>;
  count: Partial<Record<Discipline, number>>;
};

const ORDER: Discipline[] = ["SWIM", "BIKE", "RUN", "STRENGTH", "OTHER"];
const DAYS = ["søn", "man", "tir", "ons", "tor", "fre", "lør"];

const h = (sec: number) => (sec / 3600).toLocaleString("da-DK", { maximumFractionDigits: 1, minimumFractionDigits: sec > 0 && sec < 36000 ? 1 : 0 });

function km(m: number, s: Discipline): string | null {
  if (!m || s === "STRENGTH") return null;
  if (s === "SWIM") return `${Math.round(m).toLocaleString("da-DK")} m`;
  return `${(m / 1000).toLocaleString("da-DK", { maximumFractionDigits: 1 })} km`;
}

function weekName(w: WeekData, current: boolean): string {
  if (current) return "Denne uge";
  const end = new Date(w.from);
  end.setDate(end.getDate() + 6);
  return `Uge ${w.from.getDate()}/${w.from.getMonth() + 1}–${end.getDate()}/${end.getMonth() + 1}`;
}

export function WeekChart({ weeks, now = new Date() }: { weeks: WeekData[]; now?: Date }) {
  const used = ORDER.filter((s) => weeks.some((w) => w.bySport[s]));
  if (used.length === 0) return null;
  const past = weeks.slice(0, -1);
  const cur = weeks[weeks.length - 1];
  const avg = (s: Discipline) => past.reduce((t, w) => t + (w.bySport[s] ?? 0), 0) / Math.max(1, past.length);
  const max = Math.max(1, ...weeks.flatMap((w) => used.map((s) => w.bySport[s] ?? 0)));
  const total = (w: WeekData) => used.reduce((t, s) => t + (w.bySport[s] ?? 0), 0);
  const totalAvg = past.reduce((t, w) => t + total(w), 0) / Math.max(1, past.length);
  const today = DAYS[now.getDay()];

  return (
    <div className="tb">
      <div className="tb-head muted">
        <span>Disciplin</span>
        <span className="tb-num">Denne uge</span>
        <span className="tb-num">Snit</span>
        <span className="tb-weeks">{weeks.map((w, i) => <small key={w.label} className={i === 0 || i === weeks.length - 1 ? "edge" : undefined}>{i === weeks.length - 1 ? "Nu" : w.label}</small>)}</span>
      </div>
      <ul className="tb-rows">
        {used.map((s) => {
          const a = avg(s);
          return (
            <li key={s} className={`disc disc-${s}`}>
              <span className="tb-name"><DisciplineIcon discipline={s} size={16} />{DISCIPLINE_LABEL[s]}</span>
              <span className="tb-num"><b>{h(cur.bySport[s] ?? 0)}</b> t</span>
              <span className="tb-num muted">{h(a)} t</span>
              <span className="tb-weeks" role="img" aria-label={`${DISCIPLINE_LABEL[s]}: ${weeks.map((w, i) => `${weekName(w, i === weeks.length - 1)} ${h(w.bySport[s] ?? 0)} timer`).join(", ")}`}>
                {weeks.map((w, i) => {
                  const sec = w.bySport[s] ?? 0;
                  const isCur = i === weeks.length - 1;
                  const dist = km(w.meters[s] ?? 0, s);
                  const n = w.count[s] ?? 0;
                  return (
                    <span key={w.label} className={`tb-bar${isCur ? " cur" : ""}`} tabIndex={0}>
                      <i style={{ height: sec ? `max(3px, ${(sec / max) * 100}%)` : 0 }} />
                      <span className="tb-tip" role="tooltip">
                        <b>{weekName(w, isCur)}</b>
                        {DISCIPLINE_LABEL[s]}: {h(sec)} t{dist ? ` · ${dist}` : ""}
                        <br />{n} {n === 1 ? "træning" : "træninger"}{isCur ? ` (til og med ${today})` : ""}
                      </span>
                    </span>
                  );
                })}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="tb-total">
        <span>I alt</span>
        <span className="tb-num"><b>{h(total(cur))}</b> t</span>
        <span className="tb-num muted">{h(totalAvg)} t</span>
        <span className="muted tb-note">Snit for de {past.length} forrige uger. Ugen er i gang, så &quot;Nu&quot; er ikke færdig endnu.</span>
      </div>
    </div>
  );
}
