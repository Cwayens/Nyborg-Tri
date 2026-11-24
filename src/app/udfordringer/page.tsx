import Link from "next/link";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { requireFeature } from "@/lib/features";
import { DISCIPLINE_LABEL, hasRole } from "@/lib/roles";
import { dato } from "@/lib/format";
import { METRIC_LABEL, challengeStatus, formatAmount } from "@/lib/challenges";
import { ChallengeCard } from "@/components/ChallengeCard";
import { createChallenge } from "./actions";

export const metadata = { title: "Klubudfordringer" };

export default async function Challenges({ searchParams }: { searchParams: Promise<{ ny?: string; fejl?: string }> }) {
  const user = await requireUser("/udfordringer");
  await requireFeature("udfordringer");
  const { ny, fejl } = await searchParams;
  const trainer = hasRole(user.role, "TRAINER");
  const now = new Date();
  const [active, past] = await Promise.all([
    prisma.challenge.findMany({ where: { endsAt: { gt: now } }, orderBy: { startsAt: "asc" } }),
    prisma.challenge.findMany({ where: { endsAt: { lte: now } }, orderBy: { endsAt: "desc" }, take: 6 }),
  ]);
  const status = await Promise.all(active.map((c) => challengeStatus(c, user.id)));
  const pastStatus = await Promise.all(past.map((c) => challengeStatus(c, user.id)));
  const today = now.toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  return (
    <>
      <div className="section-head" style={{ marginTop: 0 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Klubudfordringer</h1>
          <p className="muted" style={{ margin: 0 }}>Fælles mål for hele klubben. Alle træninger tæller, og du får mærker for at være med, ikke for at vinde.</p>
        </div>
        {trainer && !ny && <Link href="/udfordringer?ny=1" className="button">+ Ny udfordring</Link>}
      </div>
      {fejl && <p className="status-warn">{fejl}</p>}

      {trainer && ny && (
        <form action={createChallenge} className="card stack" style={{ marginBottom: 20 }}>
          <label>Titel<input name="title" required placeholder="fx Decembers 1000 km" /></label>
          <div className="row">
            <label>Sport
              <select name="discipline" defaultValue="">
                <option value="">Alle sportsgrene</option>
                {(["SWIM", "BIKE", "RUN"] as const).map((d) => <option key={d} value={d}>{DISCIPLINE_LABEL[d]}</option>)}
              </select>
            </label>
            <label>Måles i
              <select name="metric" defaultValue="KM">
                {(["KM", "HOURS", "SESSIONS"] as const).map((m) => <option key={m} value={m}>{METRIC_LABEL[m].label}</option>)}
              </select>
            </label>
            <label>Mål<input type="number" name="goal" min={1} required defaultValue={1000} /></label>
          </div>
          <div className="row">
            <label>Fra<input type="date" name="start" defaultValue={today} required /></label>
            <label>Til<input type="date" name="end" defaultValue={monthEnd} required /></label>
          </div>
          <label>Beskrivelse (valgfri)<input name="description" maxLength={500} placeholder="fx Vi løber og cykler os gennem mørket sammen" /></label>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="button" type="submit">Opret</button>
            <Link href="/udfordringer" className="button ghost">Annullér</Link>
          </div>
        </form>
      )}

      {active.length === 0 && <p className="card empty">Ingen udfordringer lige nu.{trainer ? " Opret den første!" : " Trænerne lægger snart en op."}</p>}
      <div className="challenges">
        {active.map((c, i) => <ChallengeCard key={c.id} c={c} s={status[i]} canDelete={trainer} />)}
      </div>

      {past.length > 0 && (
        <>
          <h2>Tidligere udfordringer</h2>
          <ul className="past-challenges">
            {past.map((c, i) => (
              <li key={c.id}>
                <b>{c.title}</b> <span className="muted">til {dato(c.endsAt)}: {formatAmount(c.metric, pastStatus[i].club)} af {formatAmount(c.metric, c.goal)}</span>
                {pastStatus[i].pct >= 100 && <span className="pill ok">Nået</span>}
                {pastStatus[i].badges.map((b) => <span key={b.key} className="badge" title={b.text}>{b.label}</span>)}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
