import type { Challenge } from "@prisma/client";
import { DISCIPLINE_LABEL } from "@/lib/roles";
import { dato } from "@/lib/format";
import { formatAmount, type challengeStatus } from "@/lib/challenges";
import { deleteChallenge, toggleChallenge } from "@/app/udfordringer/actions";

type Status = Awaited<ReturnType<typeof challengeStatus>>;

export function ChallengeCard({ c, s, canDelete, compact }: { c: Challenge; s: Status; canDelete?: boolean; compact?: boolean }) {
  const started = c.startsAt <= new Date();
  return (
    <article className={`card challenge${c.discipline ? ` disc disc-${c.discipline}` : ""}`}>
      <header>
        <div>
          <span className="disc-label">{c.discipline ? DISCIPLINE_LABEL[c.discipline] : "Alle sportsgrene"} · {started ? `til ${dato(c.endsAt)}` : `starter ${dato(c.startsAt)}`}</span>
          <h3>{c.title}</h3>
        </div>
        <form action={toggleChallenge}>
          <input type="hidden" name="id" value={c.id} />
          <button className={`button small ${s.joined ? "secondary" : ""}`} type="submit">{s.joined ? "✓ Med · Meld fra" : "Vær med"}</button>
        </form>
      </header>
      {c.description && !compact && <p style={{ margin: "4px 0 10px" }}>{c.description}</p>}
      <div className="meter big" role="progressbar" aria-valuenow={s.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.title}: ${s.pct} %`}><i style={{ width: `${s.pct}%` }} /></div>
      <p className="challenge-nums">
        <b>{formatAmount(c.metric, s.club)}</b> <span className="muted">af {formatAmount(c.metric, c.goal)} · {s.pct} % · {s.participants.length} med</span>
      </p>
      {s.joined && (
        <p className="challenge-mine">
          Dit bidrag: <b>{formatAmount(c.metric, s.mine)}</b>
          {s.badges.map((b) => <span key={b.key} className="badge" title={b.text}>{b.label}</span>)}
        </p>
      )}
      {!compact && s.participants.length > 0 && (
        <p className="muted" style={{ margin: "6px 0 0", fontSize: "0.9rem" }}>Med: {s.participants.map((p) => p.name ?? "?").join(", ")}</p>
      )}
      {canDelete && !compact && (
        <form action={deleteChallenge} style={{ marginTop: 6 }}><input type="hidden" name="id" value={c.id} /><button className="linklike" type="submit"><small>Slet udfordring</small></button></form>
      )}
    </article>
  );
}
