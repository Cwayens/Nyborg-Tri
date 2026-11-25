import Link from "next/link";
import { getBranches, teamNames } from "@/lib/visibility";
import { requireTeamStaff } from "@/lib/staff";
import { prisma } from "@/lib/db";
import { DISCIPLINE_LABEL, hasRole } from "@/lib/roles";
import { formatDay, formatTime } from "@/lib/time";
import { featuresOff } from "@/lib/features";

export const metadata = { title: "Træner" };

export default async function TrainerHome({ searchParams }: { searchParams: Promise<{ gemt?: string; slettet?: string; afdeling?: string }> }) {
  const user = await requireTeamStaff();
  const trainer = hasRole(user.role, "TRAINER"); // ellers holdleder: kun egne hold
  const { gemt, slettet, afdeling } = await searchParams;
  const off = await featuresOff();
  const [names, branches] = await Promise.all([teamNames(), getBranches()]);
  const branch = branches.find((b) => b.id === afdeling) ?? null;
  const sessions = await prisma.trainingSession.findMany({
    where: { startsAt: { gte: new Date() }, ...(trainer ? {} : { teamId: { in: user.leads } }), ...(branch ? { team: { branchId: branch.id } } : {}) },
    include: { createdBy: { select: { id: true, name: true } }, _count: { select: { signups: true } } },
    orderBy: { startsAt: "asc" },
    take: 100,
  });
  return (
    <>
      {gemt && <p className="notice">Træningen er gemt og vises i kalenderen.</p>}
      {slettet && <p className="notice">Træningen er slettet.</p>}
      <h1>{trainer ? "Træninger" : "Mine holds træninger"}</h1>
      <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link className="button" href="/traener/ny">Opret træning</Link>
        <Link className="button secondary" href="/kalender?gruppe=alle">Se kalenderen</Link>
        {trainer && !off.has("tests") && <Link className="button ghost" href="/traener/tests">Testresultater</Link>}
        {!off.has("mail") && <Link className="button ghost" href="/admin/mail">Mail til holdet</Link>}
      </p>
      {branches.length > 1 && <p className="filters">
        <span className="muted">Afdeling:</span>
        <Link href="/traener" className={!branch ? "active" : undefined}>Alle</Link>
        {branches.map((b) => <Link key={b.id} href={`/traener?afdeling=${b.id}`} className={branch?.id === b.id ? "active" : undefined}>{b.name}</Link>)}
      </p>}
      <div className="table-scroll">
        <table className="list">
          <thead><tr><th>Dag</th><th>Tid</th><th>Træning</th><th>Hold</th><th>Træner</th><th>Tilmeldte</th><th /></tr></thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td>{formatDay(s.startsAt)}</td>
                <td>{formatTime(s.startsAt)}–{formatTime(s.endsAt)}</td>
                <td>{s.cancelledAt && <span className="pill warn">Aflyst</span>} {DISCIPLINE_LABEL[s.discipline]}: {s.title}<br /><span className="muted">{s.location}</span></td>
                <td>{names.get(s.teamId ?? "") ?? "–"}</td>
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
