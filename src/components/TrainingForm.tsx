import type { TrainingSession } from "@prisma/client";
import { DISCIPLINE_LABEL, GROUP_LABEL, GROUPS } from "@/lib/roles";
import { toLocalInput } from "@/lib/time";
import { isWorkout, toText } from "@/lib/workout";

type Props = { action: (formData: FormData) => Promise<void>; training?: TrainingSession; allowRepeat?: boolean };

export function TrainingForm({ action, training, allowRepeat }: Props) {
  const start = training ? toLocalInput(training.startsAt) : "";
  const end = training ? toLocalInput(training.endsAt) : "";
  return (
    <form action={action} className="stack">
      <label>Titel<input name="title" defaultValue={training?.title} placeholder="fx Svømning med træner" required /></label>
      <label>
        Disciplin
        <select name="discipline" defaultValue={training?.discipline ?? "SWIM"}>
          {Object.entries(DISCIPLINE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label>Sted<input name="location" defaultValue={training?.location} placeholder="fx Sportsbassin bane 4 og 5" required /></label>
      <div className="row">
        <label>Dato<input type="date" name="date" defaultValue={start.slice(0, 10)} required /></label>
        <label>Fra<input type="time" name="start" defaultValue={start.slice(11)} required /></label>
        <label>Til<input type="time" name="end" defaultValue={end.slice(11)} required /></label>
      </div>
      <fieldset>
        <legend>Gruppe (vælg én)</legend>
        {GROUPS.map((g) => (
          <label key={g} className="check">
            <input type="radio" name="group" value={g} defaultChecked={training?.group === g} required /> {GROUP_LABEL[g]}
          </label>
        ))}
      </fieldset>
      <fieldset className="program-field">
        <legend>Træningsprogram (valgfrit)</legend>
        <p className="muted">
          Hent en træning fra TrainingPeaks: åbn den, vælg <b>Export</b> og gem som <b>.zwo</b> (cykel og løb) eller <b>.mrc</b>. Intensiteten
          er i procent af FTP (cykel), tærskelfart (løb) eller 100 m-fart (svøm), så hver atlet ser sine egne watt og tempoer.
        </p>
        <label>Importér fil<input type="file" name="programFile" accept=".zwo,.mrc,.erg,.json,.txt" /></label>
        <label>
          …eller skriv programmet
          <textarea
            name="program"
            defaultValue={isWorkout(training?.workout) ? toText(training.workout) : ""}
            placeholder={"10min 60%\n5x(4min 105%, 3min 55%)\n8x100m 110% 20s pause\n10min 50%"}
            style={{ minHeight: 110, fontFamily: "ui-monospace, monospace" }}
          />
        </label>
      </fieldset>
      <label>Beskrivelse (valgfri)<textarea name="description" defaultValue={training?.description ?? ""} style={{ minHeight: 120 }} /></label>
      {allowRepeat && (
        <label>
          Gentag hver uge
          <select name="repeatWeeks" defaultValue="1">
            <option value="1">Nej, kun denne dato</option>
            {[4, 8, 12, 16, 26, 52].map((n) => <option key={n} value={n}>I {n} uger</option>)}
          </select>
        </label>
      )}
      <button className="button" type="submit">Gem træning</button>
    </form>
  );
}
