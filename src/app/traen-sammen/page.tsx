import Link from "next/link";
import { requireUser } from "@/auth";
import { canSignUp } from "@/lib/access";
import { prisma } from "@/lib/db";
import { DISCIPLINE_LABEL } from "@/lib/roles";
import { WorkoutCard } from "@/components/WorkoutCard";
import { createWorkout } from "./actions";
import { referencesFor } from "@/lib/program-upload";
import { isOn } from "@/lib/features";

export const metadata = { title: "Træn sammen" };

type Props = { searchParams: Promise<{ ny?: string; fejl?: string; oprettet?: string; sport?: string }> };

export default async function TrainTogether({ searchParams }: Props) {
  const user = await requireUser("/traen-sammen");
  const { ny, fejl, oprettet, sport } = await searchParams;
  const eligible = await canSignUp(user.id);
  const workouts = await prisma.groupWorkout.findMany({
    where: { startsAt: { gte: new Date(Date.now() - 2 * 3600 * 1000) }, ...(sport ? { discipline: sport as never } : {}) },
    include: { host: { select: { name: true } }, participants: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } } },
    orderBy: { startsAt: "asc" },
    take: 50,
  });
  const refs = await referencesFor(user.id);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="section-head" style={{ marginTop: 0 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Træn sammen</h1>
          <p className="muted" style={{ margin: 0 }}>
            Skal du ud at løbe, cykle eller svømme? Slå det op, så andre kan hoppe med.
            {(await isOn("makker")) && <> Eller <Link href="/makker">find en makker i dit tempo</Link>.</>}
          </p>
        </div>
        {!ny && eligible && <Link href="/traen-sammen?ny=1" className="button">+ Slå en tur op</Link>}
      </div>

      {oprettet && <p className="notice">Din tur er slået op. Andre medlemmer kan nu se den og hoppe med.</p>}
      {fejl && <p className="status-warn">{fejl}</p>}
      {!eligible && <p className="card">Du kan slå ture op og hoppe med, når du er medlem. <Link href="/bliv-medlem">Se mulighederne</Link></p>}

      {ny && eligible && (
        <section className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>Ny tur</h2>
          <form action={createWorkout} className="stack" encType="multipart/form-data" style={{ maxWidth: "100%" }}>
            <div className="row">
              <label>Sport
                <select name="discipline" defaultValue="RUN">
                  {(["RUN", "BIKE", "SWIM", "STRENGTH", "OTHER"] as const).map((d) => <option key={d} value={d}>{DISCIPLINE_LABEL[d]}</option>)}
                </select>
              </label>
              <label>Dato<input type="date" name="date" min={today} defaultValue={today} required /></label>
              <label>Tid<input type="time" name="time" defaultValue="17:30" required /></label>
            </div>
            <label>Hvad skal I?<input name="title" placeholder="fx Rolig langtur 15 km (eller tag navnet fra programmet)" /></label>
            <div className="row">
              <label>Mødested<input name="location" placeholder="fx P-pladsen ved hallen" required /></label>
              <label>Varighed (min)<input type="number" name="durationMin" defaultValue={60} min={10} max={600} required /></label>
              <label>Max deltagere<input type="number" name="maxPeople" min={2} max={100} placeholder="Ingen grænse" /></label>
            </div>
            <label>Tempo/niveau (valgfrit)<input name="level" placeholder="fx 5:30-6:00 /km eller 28-30 km/t" /></label>
            <fieldset className="program-field">
              <legend>Program fra TrainingPeaks (valgfrit)</legend>
              <p className="muted">
                Åbn træningen i TrainingPeaks, vælg <b>Export</b> og gem som <b>.fit</b>, <b>.zwo</b> eller <b>.mrc</b>. Programmet vises i procent
                af FTP eller tærskelfart, så alle der hopper med, ser deres egne watt og tempoer og kan hente det til uret.
              </p>
              <label>Importér fil<input type="file" name="programFile" accept=".fit,.zwo,.mrc,.erg,.json,.txt" /></label>
              <label>…eller skriv det<textarea name="program" placeholder={"10min 60%\n5x(4min 105%, 3min 55%)\n10min 50%"} style={{ minHeight: 80, fontFamily: "ui-monospace, monospace" }} /></label>
              <label className="check"><input type="checkbox" name="durationAuto" value="1" defaultChecked /><span>Brug programmets længde som varighed</span></label>
            </fieldset>
            <label>Besked (valgfri)<textarea name="description" style={{ minHeight: 80, fontFamily: "inherit" }} placeholder="fx Vi tager en kaffe bagefter" /></label>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="button" type="submit">Slå op</button>
              <Link href="/traen-sammen" className="button ghost">Annullér</Link>
            </div>
          </form>
        </section>
      )}

      <p className="filters">
        <Link href="/traen-sammen" className={!sport ? "active" : undefined}>Alle</Link>
        {(["RUN", "BIKE", "SWIM"] as const).map((d) => (
          <Link key={d} href={`/traen-sammen?sport=${d}`} className={sport === d ? "active" : undefined}>{DISCIPLINE_LABEL[d]}</Link>
        ))}
      </p>
      {workouts.length === 0 ? (
        <div className="card empty">Ingen ture slået op endnu. Vær den første!</div>
      ) : (
        workouts.map((w) => <WorkoutCard key={w.id} w={w} userId={user.id} canJoin={eligible} refs={refs} />)
      )}
    </>
  );
}
