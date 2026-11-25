import type { Discipline } from "@prisma/client";
import { disciplineLabel } from "@/lib/roles";
import { INTL, translator, type Locale } from "@/lib/i18n-core";
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
const DAYS = { da: ["søn", "man", "tir", "ons", "tor", "fre", "lør"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };

const h = (sec: number, loc: Locale = "da") => (sec / 3600).toLocaleString(INTL[loc], { maximumFractionDigits: 1, minimumFractionDigits: sec > 0 && sec < 36000 ? 1 : 0 });

function km(m: number, s: Discipline, loc: Locale): string | null {
  if (!m || s === "STRENGTH") return null;
  if (s === "SWIM") return `${Math.round(m).toLocaleString(INTL[loc])} m`;
  return `${(m / 1000).toLocaleString(INTL[loc], { maximumFractionDigits: 1 })} km`;
}

function weekName(w: WeekData, current: boolean, loc: Locale): string {
  if (current) return loc === "en" ? "This week" : "Denne uge";
  const end = new Date(w.from);
  end.setDate(end.getDate() + 6);
  return `${loc === "en" ? "Week" : "Uge"} ${w.from.getDate()}/${w.from.getMonth() + 1}–${end.getDate()}/${end.getMonth() + 1}`;
}

export function WeekChart({ weeks, now = new Date(), loc = "da" }: { weeks: WeekData[]; now?: Date; loc?: Locale }) {
  const t = translator(loc);
  const u = loc === "en" ? "h" : "t";
  const used = ORDER.filter((s) => weeks.some((w) => w.bySport[s]));
  if (used.length === 0) return null;
  const past = weeks.slice(0, -1);
  const cur = weeks[weeks.length - 1];
  const avg = (s: Discipline) => past.reduce((t, w) => t + (w.bySport[s] ?? 0), 0) / Math.max(1, past.length);
  const max = Math.max(1, ...weeks.flatMap((w) => used.map((s) => w.bySport[s] ?? 0)));
  const total = (w: WeekData) => used.reduce((t, s) => t + (w.bySport[s] ?? 0), 0);
  const totalAvg = past.reduce((t, w) => t + total(w), 0) / Math.max(1, past.length);
  const today = DAYS[loc][now.getDay()];

  return (
    <div className="tb">
      <div className="tb-head muted">
        <span>{t("Disciplin", "Discipline")}</span>
        <span className="tb-num">{t("Denne uge", "This week")}</span>
        <span className="tb-num">{t("Snit", "Avg")}</span>
        <span className="tb-weeks">{weeks.map((w, i) => <small key={w.label} className={i === 0 || i === weeks.length - 1 ? "edge" : undefined}>{i === weeks.length - 1 ? t("Nu", "Now") : w.label}</small>)}</span>
      </div>
      <ul className="tb-rows">
        {used.map((s) => {
          const a = avg(s);
          return (
            <li key={s} className={`disc disc-${s}`}>
              <span className="tb-name"><DisciplineIcon discipline={s} size={16} />{disciplineLabel(s, loc)}</span>
              <span className="tb-num"><b>{h(cur.bySport[s] ?? 0, loc)}</b> {u}</span>
              <span className="tb-num muted">{h(a, loc)} {u}</span>
              <span className="tb-weeks" role="img" aria-label={`${disciplineLabel(s, loc)}: ${weeks.map((w, i) => `${weekName(w, i === weeks.length - 1, loc)} ${h(w.bySport[s] ?? 0, loc)} ${t("timer", "hours")}`).join(", ")}`}>
                {weeks.map((w, i) => {
                  const sec = w.bySport[s] ?? 0;
                  const isCur = i === weeks.length - 1;
                  const dist = km(w.meters[s] ?? 0, s, loc);
                  const n = w.count[s] ?? 0;
                  return (
                    <span key={w.label} className={`tb-bar${isCur ? " cur" : ""}`} tabIndex={0}>
                      <i style={{ height: sec ? `max(3px, ${(sec / max) * 100}%)` : 0 }} />
                      <span className="tb-tip" role="tooltip">
                        <b>{weekName(w, isCur, loc)}</b>
                        {disciplineLabel(s, loc)}: {h(sec, loc)} {u}{dist ? ` · ${dist}` : ""}
                        <br />{n} {loc === "en" ? (n === 1 ? "session" : "sessions") : n === 1 ? "træning" : "træninger"}{isCur ? (loc === "en" ? ` (up to ${today})` : ` (til og med ${today})`) : ""}
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
        <span>{t("I alt", "Total")}</span>
        <span className="tb-num"><b>{h(total(cur), loc)}</b> {u}</span>
        <span className="tb-num muted">{h(totalAvg, loc)} {u}</span>
        <span className="muted tb-note">{t(`Snit for de ${past.length} forrige uger. Ugen er i gang, så "Nu" er ikke færdig endnu.`, `Average of the previous ${past.length} weeks. The week is still running, so "Now" isn't finished yet.`)}</span>
      </div>
    </div>
  );
}
