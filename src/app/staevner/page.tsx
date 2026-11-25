import { NOT_CHILD } from "@/lib/child-safety";
import Link from "next/link";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { requireFeature } from "@/lib/features";
import { hasRole } from "@/lib/roles";
import { dato } from "@/lib/format";
import { PinIcon, initials } from "@/components/Icons";
import { createRace, deleteRace, leaveRace, saveEntry, toggleTent } from "./actions";

export const metadata = { title: "Stævner og samkørsel" };

export default async function Races({ searchParams }: { searchParams: Promise<{ ny?: string; fejl?: string }> }) {
  const user = await requireUser("/staevner");
  await requireFeature("staevner");
  const { ny, fejl } = await searchParams;
  const trainer = hasRole(user.role, "TRAINER");
  const since = new Date(Date.now() - 864e5);
  const races = await prisma.race.findMany({
    where: { date: { gte: since } },
    include: { entries: { where: { user: NOT_CHILD }, include: { user: { select: { id: true, name: true, email: true, deletedAt: true } } }, orderBy: { createdAt: "asc" } } },
    orderBy: { date: "asc" },
  });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="section-head" style={{ marginTop: 0 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Stævner og samkørsel</h1>
          <p className="muted" style={{ margin: 0 }}>Se hvem der skal til hvad, kør sammen, og find klubteltet på stævnepladsen.</p>
        </div>
        {!ny && <Link href="/staevner?ny=1" className="button">+ Tilføj stævne</Link>}
      </div>
      {fejl && <p className="status-warn">{fejl}</p>}

      {ny && (
        <form action={createRace} className="card stack" style={{ marginBottom: 20 }}>
          <label>Stævne<input name="name" required placeholder="fx Challenge Denmark" /></label>
          <div className="row">
            <label>Dato<input type="date" name="date" min={today} required /></label>
            <label>Sted<input name="location" required placeholder="fx Vejle" /></label>
          </div>
          <div className="row">
            <label>Distancer (valgfrit)<input name="distances" placeholder="fx Sprint, Olympisk, Kids" /></label>
            <label>Link (valgfrit)<input name="url" type="url" placeholder="https://…" /></label>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="button" type="submit">Tilføj</button>
            <Link href="/staevner" className="button ghost">Annullér</Link>
          </div>
        </form>
      )}

      {races.length === 0 && <p className="card empty">Ingen stævner endnu. Tilføj det næste, du skal til.</p>}
      <div className="races">
        {races.map((r) => {
          const entries = r.entries.filter((e) => !e.user.deletedAt);
          const mine = entries.find((e) => e.userId === user.id);
          const drivers = entries.filter((e) => e.ride === "DRIVER");
          const passengers = entries.filter((e) => e.ride === "PASSENGER");
          const seats = drivers.reduce((s, d) => s + (d.seats ?? 0), 0);
          const distances = (r.distances ?? "").split(",").map((x) => x.trim()).filter(Boolean);
          return (
            <article key={r.id} id={r.id} className="card race">
              <header>
                <div className="race-date"><b>{r.date.toLocaleDateString("da-DK", { day: "numeric", timeZone: "Europe/Copenhagen" })}</b><span>{r.date.toLocaleDateString("da-DK", { month: "short", timeZone: "Europe/Copenhagen" })}</span></div>
                <div style={{ flex: 1 }}>
                  <h2 className="h3" style={{ margin: 0 }}>{r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer">{r.name}</a> : r.name}</h2>
                  <p className="muted" style={{ margin: "2px 0 0" }}><PinIcon /> {r.location} · {dato(r.date)}{r.distances ? ` · ${r.distances}` : ""}</p>
                  {r.clubTent && <span className="pill ok" style={{ marginTop: 6, display: "inline-block" }}>⛺ Klubtelt på pladsen</span>}
                </div>
              </header>

              <div className="race-cols">
                <div>
                  <h3 className="race-h">{entries.length} fra klubben skal med</h3>
                  {entries.length === 0 ? <p className="muted" style={{ margin: 0 }}>Ingen endnu.</p> : (
                    <ul className="race-people">
                      {entries.map((e) => (
                        <li key={e.id}><span className="avatar">{initials(e.user.name)}</span> {e.user.name ?? "?"}{e.distance && <span className="muted"> · {e.distance}</span>}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="race-h">Samkørsel</h3>
                  {drivers.length === 0 && passengers.length === 0 && <p className="muted" style={{ margin: 0 }}>Ingen har meldt sig endnu.</p>}
                  {drivers.length > 0 && <p style={{ margin: "0 0 4px" }}>🚗 {seats} {seats === 1 ? "plads" : "pladser"} i {drivers.length} {drivers.length === 1 ? "bil" : "biler"}, {passengers.length} søger lift</p>}
                  <ul className="race-people">
                    {drivers.map((d) => <li key={d.id}>🚗 <a href={`mailto:${d.user.email}?subject=${encodeURIComponent(`Lift til ${r.name}`)}`}>{d.user.name}</a> <span className="muted">{d.seats} {d.seats === 1 ? "plads" : "pladser"}{d.rideFrom ? ` fra ${d.rideFrom}` : ""}</span></li>)}
                    {passengers.map((p) => <li key={p.id}>🙋 <a href={`mailto:${p.user.email}?subject=${encodeURIComponent(`Lift til ${r.name}`)}`}>{p.user.name}</a> <span className="muted">søger lift{p.rideFrom ? ` fra ${p.rideFrom}` : ""}</span></li>)}
                  </ul>
                </div>
              </div>

              <details className="race-join">
                <summary className={`button small ${mine ? "secondary" : ""}`}>{mine ? "✓ Du skal med · Ret" : "Jeg skal med"}</summary>
                <form action={saveEntry} className="stack" style={{ marginTop: 10 }}>
                  <input type="hidden" name="raceId" value={r.id} />
                  <div className="row">
                    <label>Distance
                      {distances.length ? (
                        <select name="distance" defaultValue={mine?.distance ?? ""}>
                          <option value="">Ved ikke endnu</option>
                          {distances.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      ) : <input name="distance" defaultValue={mine?.distance ?? ""} placeholder="fx Sprint" />}
                    </label>
                    <label>Samkørsel
                      <select name="ride" defaultValue={mine?.ride ?? "NONE"}>
                        <option value="NONE">Nej tak</option>
                        <option value="DRIVER">Jeg kører og har plads</option>
                        <option value="PASSENGER">Jeg søger et lift</option>
                      </select>
                    </label>
                    <label>Ledige pladser<input type="number" name="seats" min={1} max={8} defaultValue={mine?.seats ?? ""} placeholder="hvis du kører" /></label>
                    <label>Fra<input name="rideFrom" defaultValue={mine?.rideFrom ?? ""} placeholder="fx klubhuset" /></label>
                  </div>
                  <p className="muted" style={{ margin: 0 }}>Dit navn og din distance vises for andre medlemmer. Kører du eller søger lift, kan de også se din mail.</p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="button small" type="submit">Gem</button>
                  </div>
                </form>
                {mine && <form action={leaveRace} style={{ marginTop: 6 }}><input type="hidden" name="raceId" value={r.id} /><button className="linklike" type="submit">Jeg skal alligevel ikke med</button></form>}
              </details>

              {(trainer || r.createdById === user.id) && (
                <div className="race-admin">
                  {trainer && <form action={toggleTent}><input type="hidden" name="id" value={r.id} /><button className="linklike" type="submit">{r.clubTent ? "Fjern klubtelt" : "Klubteltet kommer med"}</button></form>}
                  <form action={deleteRace}><input type="hidden" name="id" value={r.id} /><button className="linklike" type="submit">Slet stævne</button></form>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
