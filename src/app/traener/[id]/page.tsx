import { notFound } from "next/navigation";
import { canManageTeam, requireTeamStaff } from "@/lib/staff";
import { hasRole } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { TrainingForm } from "@/components/TrainingForm";
import { cancelTraining, createTraining, deleteTraining, updateTraining } from "../actions";

export const metadata = { title: "Træning" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ fejl?: string }> };

export default async function EditTraining({ params, searchParams }: Props) {
  const staff = await requireTeamStaff();
  // Holdledere vælger kun mellem deres egne hold
  const onlyTeams = hasRole(staff.role, "TRAINER") ? undefined : staff.leads;
  const { id } = await params;
  const { fejl } = await searchParams;
  if (id === "ny") {
    return (
      <>
        <h1>Opret træning</h1>
        {fejl && <p className="status-warn">{fejl}</p>}
        <TrainingForm action={createTraining} allowRepeat onlyTeams={onlyTeams} />
      </>
    );
  }
  const training = await prisma.trainingSession.findUnique({
    where: { id },
    include: { signups: { include: { user: { select: { name: true, email: true, phone: true } } }, orderBy: { createdAt: "asc" } } },
  });
  if (!training || !canManageTeam(staff, training.teamId)) notFound();
  return (
    <>
      <h1>Ret træning</h1>
      <section className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Tilmeldte ({training.signups.length})</h2>
        {training.signups.length === 0 ? (
          <p className="muted">Ingen tilmeldte endnu.</p>
        ) : (
          <ol>
            {training.signups.map((s) => (
              <li key={s.id}>{s.user.name ?? s.user.email}{s.user.phone ? ` · ${s.user.phone}` : ""}{s.paceGroup ? <span className="pill" style={{ marginLeft: 6 }}>{s.paceGroup}</span> : null}</li>
            ))}
          </ol>
        )}
      </section>
      {fejl && <p className="status-warn">{fejl}</p>}
      <TrainingForm action={updateTraining.bind(null, id)} training={training} onlyTeams={onlyTeams} />
      <section className="card" style={{ marginTop: 32 }}>
        <h2 style={{ marginTop: 0 }}>{training.cancelledAt ? "Træningen er aflyst" : "Aflys træning"}</h2>
        <p className="muted">
          {training.cancelledAt
            ? `Aflyst${training.cancelReason ? `: ${training.cancelReason}` : ""}. De tilmeldte kan se det i kalenderen.`
            : "Træningen bliver stående i kalenderen som aflyst, så de tilmeldte kan se det."}
        </p>
        <form action={cancelTraining.bind(null, id)} className="inline-form">
          {!training.cancelledAt && <input name="reason" placeholder="Årsag, fx svømmehallen er lukket" style={{ flex: 1, minWidth: 220 }} />}
          <button className={`button small${training.cancelledAt ? " secondary" : ""}`} type="submit">{training.cancelledAt ? "Genåbn træningen" : "Aflys"}</button>
        </form>
      </section>
      <form action={deleteTraining.bind(null, id)} className="stack" style={{ marginTop: 32 }}>
        {training.seriesId && (
          <label className="check">
            <input type="checkbox" name="scope" value="series" /> Slet også de følgende træninger i samme serie
          </label>
        )}
        <button className="button secondary" type="submit">Slet træning</button>
      </form>
    </>
  );
}
