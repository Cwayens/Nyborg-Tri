import Link from "next/link";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { DISCIPLINE_LABEL } from "@/lib/roles";
import { ActivityRow } from "@/components/ActivityRow";
import { addActivity, deleteActivity } from "./actions";

export const metadata = { title: "Mine aktiviteter" };

export default async function Activities({ searchParams }: { searchParams: Promise<{ fejl?: string; gemt?: string }> }) {
  const user = await requireUser("/aktiviteter");
  const { fejl, gemt } = await searchParams;
  const [acts, strava] = await Promise.all([
    prisma.activity.findMany({ where: { userId: user.id }, orderBy: { startAt: "desc" }, take: 60 }),
    prisma.wearableConnection.findFirst({ where: { userId: user.id, provider: "STRAVA" } }),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <h1>Mine aktiviteter</h1>
      {fejl && <p className="status-warn">{fejl}</p>}
      {gemt && <p className="notice">Aktiviteten er gemt.</p>}
      {!strava && (
        <p className="card">
          Tip: <Link href="/forbindelser">Forbind dit ur via Strava</Link>, så kommer dine træninger automatisk. Indtil da kan du registrere dem her.
        </p>
      )}

      <details className="card" style={{ marginBottom: 20 }} open={!acts.length}>
        <summary style={{ cursor: "pointer", fontWeight: 650 }}>+ Registrér en træning</summary>
        <form action={addActivity} className="stack" style={{ maxWidth: "100%", marginTop: 14 }}>
          <div className="row">
            <label>Sport
              <select name="sport" defaultValue="RUN">
                {(["RUN", "BIKE", "SWIM", "STRENGTH", "OTHER"] as const).map((s) => <option key={s} value={s}>{DISCIPLINE_LABEL[s]}</option>)}
              </select>
            </label>
            <label>Dato<input type="date" name="date" defaultValue={today} max={today} required /></label>
            <label>Tid<input type="time" name="time" defaultValue="17:00" /></label>
          </div>
          <div className="row">
            <label>Minutter<input type="number" name="minutes" min={1} max={1440} required inputMode="numeric" /></label>
            <label>Distance<input name="distance" placeholder="km (svøm: meter)" inputMode="decimal" /></label>
            <label>Navn (valgfrit)<input name="name" placeholder="fx Intervaller på banen" /></label>
          </div>
          <button className="button" type="submit" style={{ justifySelf: "start" }}>Gem</button>
        </form>
      </details>

      <section className="card">
        {acts.length === 0 ? (
          <p className="empty">Ingen aktiviteter endnu.</p>
        ) : (
          acts.map((a) => (
            <ActivityRow key={a.id} a={a} action={a.provider === "MANUAL" ? (
              <form action={deleteActivity}><input type="hidden" name="id" value={a.id} /><button className="button ghost small" type="submit" aria-label={`Slet ${a.name}`}>Slet</button></form>
            ) : undefined} />
          ))
        )}
      </section>
    </>
  );
}
