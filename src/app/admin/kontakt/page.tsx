import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/db";
import { initials } from "@/components/Icons";
import { addContact, deleteContact, moveContact, toggleHandled, updateContact } from "./actions";
import { getClub } from "@/lib/site";

export const metadata = { title: "Admin – kontakt" };

const IMG = "image/png,image/jpeg,image/webp,image/gif";

export default async function AdminContact({ searchParams }: { searchParams: Promise<{ fejl?: string; gemt?: string }> }) {
  const CLUB = await getClub();
  await requireAdmin();
  const sp = await searchParams;
  const [people, messages] = await Promise.all([
    prisma.contactPerson.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const open = messages.filter((m) => !m.handledAt).length;
  return (
    <>
      <h1>Kontakt</h1>
      {sp.fejl && <p className="status-warn">{sp.fejl}</p>}
      {sp.gemt && <p className="notice">Gemt.</p>}

      <h2 id="henvendelser">Henvendelser {open > 0 && <span className="pill">{open} nye</span>}</h2>
      <p className="muted">Beskeder fra kontaktformularen. De sendes også til klubbens mail. Svar ved at klikke på mailadressen.</p>
      {messages.length === 0 ? <p className="card empty">Ingen henvendelser endnu.</p> : (
        <ul className="ct-messages">
          {messages.map((m) => (
            <li key={m.id} className={`card${m.handledAt ? " done" : ""}`}>
              <header>
                <b>{m.name}</b> <a href={`mailto:${m.email}?subject=${encodeURIComponent("Sv: " + (m.topic ?? `Din henvendelse til ${CLUB.shortName}`))}`}>{m.email}</a>
                {m.phone && <span className="muted"> · {m.phone}</span>}
                {m.topic && <span className="pill">{m.topic}</span>}
                <span className="muted small" style={{ marginLeft: "auto" }}>{m.createdAt.toLocaleString("da-DK", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Copenhagen" })}</span>
              </header>
              <p style={{ whiteSpace: "pre-wrap" }}>{m.message}</p>
              <form action={toggleHandled}><input type="hidden" name="id" value={m.id} />
                <button className="button small secondary" type="submit">{m.handledAt ? "Markér som ny" : "Markér som besvaret"}</button></form>
            </li>
          ))}
        </ul>
      )}

      <h2>Kontaktpersoner</h2>
      <p className="muted">Vises på kontaktsiden i denne rækkefølge. Den første med telefonnummer vises også øverst som &quot;Ring til&quot;.</p>
      <ul className="sp-admin">
        {people.map((p, i) => (
          <li key={p.id} className="card">
            <div className="sp-logo">{p.photo ? <img src={p.photo} alt="" /> : <span className="avatar">{initials(p.name)}</span>}</div>
            <form action={updateContact} className="sp-fields">
              <input type="hidden" name="id" value={p.id} />
              <label>Rolle<input name="role" defaultValue={p.role} required maxLength={60} /></label>
              <label>Navn<input name="name" defaultValue={p.name} required maxLength={100} /></label>
              <label>Telefon<input name="phone" type="tel" defaultValue={p.phone ?? ""} maxLength={30} /></label>
              <label>Mail<input name="email" type="email" defaultValue={p.email ?? ""} maxLength={200} /></label>
              <label>Nyt billede (valgfrit)<input type="file" name="photo" accept={IMG} /></label>
              {p.photo && <label className="check"><input type="checkbox" name="removePhoto" /> Fjern billede</label>}
              <button className="button small" type="submit">Gem</button>
            </form>
            <div className="sp-actions">
              <form action={moveContact}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="dir" value="op" />
                <button className="button small secondary" type="submit" disabled={i === 0} aria-label={`Flyt ${p.name} op`}>↑</button></form>
              <form action={moveContact}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="dir" value="ned" />
                <button className="button small secondary" type="submit" disabled={i === people.length - 1} aria-label={`Flyt ${p.name} ned`}>↓</button></form>
              <form action={deleteContact}><input type="hidden" name="id" value={p.id} />
                <button className="linklike" type="submit">Slet</button></form>
            </div>
          </li>
        ))}
      </ul>

      <h3>Tilføj kontaktperson</h3>
      <form action={addContact} className="card stack">
        <div className="row">
          <label>Rolle<input name="role" required maxLength={60} placeholder="fx Kasserer" /></label>
          <label>Navn<input name="name" required maxLength={100} /></label>
        </div>
        <div className="row">
          <label>Telefon (valgfri)<input name="phone" type="tel" maxLength={30} /></label>
          <label>Mail (valgfri)<input name="email" type="email" maxLength={200} /></label>
        </div>
        <label>Billede (valgfrit)<input type="file" name="photo" accept={IMG} /></label>
        <button className="button" type="submit" style={{ justifySelf: "start" }}>Tilføj</button>
      </form>
    </>
  );
}
