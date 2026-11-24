import { dato } from "@/lib/format";

type Point = { date: Date; score: number; label: string };

// Fremgangsgraf for én test: op er altid bedre. Klubbens testdage vises som lodrette streger.
export function ProgressChart({ points, testDays, label }: { points: Point[]; testDays: Date[]; label: string }) {
  if (points.length < 2) return null;
  const w = 240, h = 120, l = 6, r = 6, t = 22, b = 22;
  const t0 = points[0].date.getTime();
  const t1 = Math.max(points[points.length - 1].date.getTime(), ...testDays.map((d) => d.getTime()));
  const span = t1 - t0 || 1;
  const min = Math.min(...points.map((p) => p.score)), max = Math.max(...points.map((p) => p.score));
  const vs = max - min || 1;
  const x = (d: Date) => l + ((d.getTime() - t0) / span) * (w - l - r);
  const y = (v: number) => h - b - ((v - min) / vs) * (h - t - b);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)} ${y(p.score).toFixed(1)}`).join(" ");
  const best = points.reduce((a, p) => (p.score > a.score ? p : a));
  const first = points[0], last = points[points.length - 1];
  const days = testDays.filter((d) => d.getTime() >= t0);
  return (
    <figure className="progress-chart">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${label}: fra ${first.label} til ${last.label}, bedste ${best.label}`}>
        <line x1={l} x2={w - r} y1={h - b} y2={h - b} className="pc-axis" />
        {days.map((d) => (
          <g key={d.toISOString()}>
            <line x1={x(d)} x2={x(d)} y1={t - 6} y2={h - b} className="pc-testday" />
            <title>Testdag {dato(d)}</title>
          </g>
        ))}
        <path d={path} className="pc-line" />
        {points.map((p) => (
          <circle key={p.date.toISOString() + p.score} cx={x(p.date)} cy={y(p.score)} r={p === best ? 5 : 3.5} className={p === best ? "pc-best" : "pc-dot"}>
            <title>{`${dato(p.date)}: ${p.label}`}</title>
          </circle>
        ))}
        <text x={x(best.date)} y={y(best.score) - 9} textAnchor={x(best.date) > w - 40 ? "end" : x(best.date) < 40 ? "start" : "middle"} className="pc-label">{best.label}</text>
        <text x={l} y={h - 6} className="pc-date">{short(first.date)}</text>
        <text x={w - r} y={h - 6} textAnchor="end" className="pc-date">{short(last.date)}</text>
      </svg>
      {days.length > 0 && <figcaption className="muted"><i className="pc-key" /> Klubbens testdage</figcaption>}
    </figure>
  );
}

const short = (d: Date) => d.toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "2-digit", timeZone: "Europe/Copenhagen" });
