import Link from "next/link";
import { requireUser } from "@/auth";

export const metadata = { title: "Program på uret" };

// Vejledning: sådan kommer klubbens træningsprogram over på uret eller cykelcomputeren
export default async function ProgramOnWatch() {
  await requireUser("/program-paa-uret");
  return (
    <div className="content" style={{ maxWidth: 760 }}>
      <h1>Træningsprogram på uret</h1>
      <p>
        Når du er tilmeldt en træning med program, kan du hente programmet som fil med <b>dine egne watt og tempi</b> (ud fra Mine tests).
        Så viser uret hvert interval, og hvor hårdt du skal køre eller løbe.
      </p>

      <h2>Garmin</h2>
      <ol>
        <li>Tryk <b>Hent til ur (.fit)</b> på træningen.</li>
        <li>Sæt uret til computeren med kablet. Det dukker op som et drev.</li>
        <li>Kopiér filen til mappen <code>Garmin/NewFiles</code> på uret, og tag kablet ud.</li>
        <li>Programmet ligger under <i>Træning → Workouts</i> på uret.</li>
      </ol>

      <h2>Wahoo, Hammerhead og Coros</h2>
      <p>
        Wahoo ELEMNT og Hammerhead Karoo kan åbne .fit-workouts fra telefonen: åbn filen og vælg appen. Coros: importér filen i Coros-appen under
        Træning, og synk til uret.
      </p>

      <h2>Zwift, TrainerRoad og Wahoo SYSTM</h2>
      <p>
        Hent <b>.zwo</b>-filen og læg den i mappen <code>Dokumenter/Zwift/Workouts/&lt;dit id&gt;</code>. Zwift bruger din egen FTP fra Zwift, så
        procenterne passer automatisk.
      </p>

      <p className="muted">
        På sigt kan programmet sendes direkte til uret, når du tilmelder dig. Det kræver en aftale med Garmin og de andre producenter.
      </p>
      <p><Link href="/kalender">Til kalenderen</Link></p>
    </div>
  );
}
