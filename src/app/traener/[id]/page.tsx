import { notFound } from "next/navigation";
import { requireTrainer } from "@/auth";
import { prisma } from "@/lib/db";
import { TrainingForm } from "@/components/TrainingForm";
import { createTraining, deleteTraining, updateTraining } from "../actions";

export const metadata = { title: "Træning" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ fejl?: string }> };

export default async function EditTraining({ params, searchParams }: Props) {
  await requireTrainer();
  const { id } = await params;
  const { fejl } = await searchParams;
  if (id === "ny") {
    return (
      <>
        <h1>Opret træning</h1>
        {fejl && <p className="status-warn">{fejl}</p>}
        <TrainingForm action={createTraining} allowRepeat />
      </>
    );
  }
  const training = await prisma.trainingSession.findUnique({ where: { id } });
  if (!training) notFound();
  return (
    <>
      <h1>Ret træning</h1>
      {fejl && <p className="status-warn">{fejl}</p>}
      <TrainingForm action={updateTraining.bind(null, id)} training={training} />
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
