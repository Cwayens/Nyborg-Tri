import Link from "next/link";
import { requireTrainer } from "@/auth";
import { prisma } from "@/lib/db";
import { DISCIPLINE_LABEL, GROUP_LABEL } from "@/lib/roles";
import { formatDay, formatTime } from "@/lib/time";

export const metadata = { title: "Træner" };

export default async function TrainerHome({ searchParams }: { searchParams: Promise<{ gemt?: string; slettet?: string }> }) {
  const user = await requireTrainer();
  const { gemt, slettet } = await searchParams;
  const sessions = await prisma.trainingSession.findMany({
    where: { startsAt: { gte: new Date() } },
    include: { createdBy: { select: { id: true, name: true } }, _count: { select: { signups: true } } },
    orderBy: { startsAt: "asc" },
    take: 100,
  });
  return (
    <>
      {gemt && <p className="notice">Træningen er gemt og vises i kalenderen.</p>}
      {slettet && <p className="notice">Træningen er slettet.</p>}
      <h1>Træninger</h1>
      <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link className="button" href="/traener/ny">Opret træning</Link>
        <Link className="button secondary" href="/kalender?gruppe=alle">Se kalenderen</Link>
        <Link className="button ghost" href="/traener/tests">Testresultater</Link>
      </p>
      <div className="table-scroll">
        <table className="list">
          <thead><tr><th>Dag</th><th>Tid</th><th>Træning</th><th>Gruppe</th><th>Træner</th><th>Tilmeldte</th><th /></tr></thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td>{formatDay(s.startsAt)}</td>
                <td>{formatTime(s.startsAt)}–{formatTime(s.endsAt)}</td>
                <td>{s.cancelledAt && <span className="pill warn">Aflyst</span>} {DISCIPLINE_LABEL[s.discipline]}: {s.title}<br /><span className="muted">{s.location}</span></td>
                <td>{GROUP_LABEL[s.group]}</td>
                <td>{s.createdBy.id === user.id ? "Dig" : s.createdBy.name}</td>
                <td>{s._count.signups}</td>
                <td><Link href={`/traener/${s.id}`}>Ret / deltagere</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sessions.length === 0 && <p className="muted">Ingen kommende træninger endnu.</p>}
    </>
  );
}
