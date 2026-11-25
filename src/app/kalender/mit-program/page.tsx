import Link from "next/link";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { isOn, requireFeature } from "@/lib/features";
import { DISCIPLINE_LABEL } from "@/lib/roles";
import { dayKey, formatDay, parseLocal } from "@/lib/time";
import { DisciplineIcon } from "@/components/Icons";
import { addManual, deleteImported, deletePlanned, importFiles } from "./actions";

export const metadata = { title: "Mit eget program" };

type Props = { searchParams: Promise<{ fejl?: string; importeret?: string; opdateret?: string; ryddet?: string }> };

export default async function MyProgram({ searchParams }: Props) {
  await requireFeature("egetprogram");
  const user = await requireUser("/kalender/mit-program");
  const sp = await searchParams;
  const today = dayKey(new Date());
  const [list, imported, share] = await Promise.all([
    prisma.plannedWorkout.findMany({ where: { userId: user.id, day: { gte: today } }, orderBy: [{ day: "asc" }, { time: "asc" }], take: 60 }),
    prisma.plannedWorkout.count({ where: { userId: user.id, source: "kalender", sharedId: null } }),
    isOn("traensammen"),
  ]);

  return (
    <>
      <p className="muted" style={{ margin: 0 }}><Link href="/kalender">← Kalender</Link></p>
      <h1 style={{ marginBottom: 4 }}>Mit eget program</h1>
      <p className="muted" style={{ marginTop: 0, maxWidth: 680 }}>
        Hent din træningsplan fra TrainingPeaks, Garmin Connect, Intervals.icu eller en anden app ind i din kalender her. Kun du kan se den.
        {share && " Vil du have selskab, deler du en træning til Træn sammen og skriver bare tid og sted på."}
      </p>

      {sp.fejl && <p className="status-warn">{sp.fejl}</p>}
      {sp.importeret && <p className="notice">{sp.importeret} {sp.importeret === "1" ? "træning" : "træninger"} lagt i din kalender{Number(sp.opdateret) ? `, ${sp.opdateret} opdateret` : ""}. <Link href="/kalender">Se kalenderen</Link></p>}
      {sp.ryddet && <p className="notice">De importerede træninger er fjernet. Delte ture er bevaret.</p>}

      <div className="grid two" style={{ alignItems: "start" }}>
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Importér</h2>
          <form action={importFiles} className="stack" encType="multipart/form-data" style={{ maxWidth: "100%" }}>
            <label>Filer<input type="file" name="files" multiple required accept=".ics,.fit,.zwo,.mrc,.erg,.json,.txt" /></label>
            <div className="row">
              <label>Dag for programfiler<input type="date" name="day" defaultValue={today} /></label>
              <label>Sport, hvis filen ikke siger det
                <select name="discipline" defaultValue="RUN">
                  {(["RUN", "BIKE", "SWIM", "STRENGTH", "OTHER"] as const).map((d) => <option key={d} value={d}>{DISCIPLINE_LABEL[d]}</option>)}
                </select>
              </label>
            </div>
            <button className="button" type="submit">Læg i min kalender</button>
          </form>
          <details className="howto">
            <summary>Sådan henter du filerne</summary>
            <ul>
              <li><b>Hele planen (.ics):</b> find kalenderlinket (iCal) i din træningsapp, fx under indstillinger for kalender-synkronisering i TrainingPeaks eller Intervals.icu. Åbn linket i browseren, gem filen og vælg den her. Alle træninger kommer ind på de rigtige dage. Importerer du samme kalender igen, bliver træningerne opdateret i stedet for at komme dobbelt.</li>
              <li><b>Én træning med program (.fit, .zwo, .mrc, .erg):</b> åbn træningen i TrainingPeaks, vælg Export og gem filen. Vælg dagen ovenfor. Programmet vises i procent af din FTP eller tærskelfart, så andre kan følge det i deres eget tempo.</li>
            </ul>
          </details>
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>Skriv selv</h2>
          <form action={addManual} className="stack" style={{ maxWidth: "100%" }}>
            <div className="row">
              <label>Dag<input type="date" name="day" defaultValue={today} required /></label>
              <label>Sport
                <select name="discipline" defaultValue="RUN">
                  {(["RUN", "BIKE", "SWIM", "STRENGTH", "OTHER"] as const).map((d) => <option key={d} value={d}>{DISCIPLINE_LABEL[d]}</option>)}
                </select>
              </label>
              <label>Minutter<input type="number" name="durationMin" min={5} max={600} placeholder="60" /></label>
            </div>
            <label>Hvad skal du?<input name="title" required placeholder="fx Intervaller 5x4 min" /></label>
            <label>Program (valgfrit)<textarea name="program" placeholder={"10min 60%\n5x(4min 105%, 3min 55%)\n10min 50%"} style={{ minHeight: 80, fontFamily: "ui-monospace, monospace" }} /></label>
            <button className="button secondary" type="submit">Tilføj</button>
          </form>
        </section>
      </div>

      <div className="section-head"><h2>Kommende ({list.length})</h2>
        {imported > 0 && (
          <form action={deleteImported}><button className="button ghost small" type="submit">Fjern {imported} importerede</button></form>
        )}
      </div>
      {list.length === 0 ? (
        <p className="card empty">Ingen egne træninger endnu. Importér din plan ovenfor.</p>
      ) : (
        <div className="card">
          {list.map((p) => (
            <div key={p.id} className="item">
              <DisciplineIcon discipline={p.discipline} />
              <div className="body">
                <div className="title">{p.title}</div>
                <div className="meta">
                  {formatDay(parseLocal(`${p.day}T12:00`))}{p.time ? ` kl. ${p.time}` : ""}{p.durationMin ? ` · ${p.durationMin} min` : ""}
                  {p.workout ? " · med program" : ""}{p.sharedId ? " · delt i Træn sammen" : ""}
                </div>
              </div>
              <div className="item-actions">
                <Link className="button small ghost" href={`/kalender?maaned=${p.day.slice(0, 7)}&dag=${p.day}#dag`}>Vis</Link>
                {share && !p.sharedId && p.day >= today && <Link className="button small secondary" href={`/traen-sammen?ny=1&fra=${p.id}`}>Del</Link>}
                <form action={deletePlanned}><input type="hidden" name="id" value={p.id} /><button className="button small ghost" type="submit" aria-label={`Slet ${p.title}`}>Slet</button></form>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
