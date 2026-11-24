import { requireAdmin } from "@/auth";
import { AdminNav } from "@/components/AdminNav";
import { prisma } from "@/lib/db";
import { addSponsor, deleteSponsor, moveSponsor, updateSponsor } from "./actions";

export const metadata = { title: "Admin – sponsorer" };

export default async function AdminSponsors({ searchParams }: { searchParams: Promise<{ fejl?: string; gemt?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const sponsors = await prisma.sponsor.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return (
    <>
      <h1>Sponsorer</h1>
      <AdminNav />
      <p className="muted">Sponsorerne kører i en bjælke på forsiden i denne rækkefølge. Skjulte sponsorer vises ikke.</p>
      {sp.fejl && <p className="status-warn">{sp.fejl}</p>}
      {sp.gemt && <p className="notice">Gemt.</p>}

      <ul className="sp-admin">
        {sponsors.map((s, i) => (
          <li key={s.id} className="card">
            <div className="sp-logo"><img src={s.logo} alt="" /></div>
            <form action={updateSponsor} className="sp-fields">
              <input type="hidden" name="id" value={s.id} />
              <label>Navn<input name="name" defaultValue={s.name} required maxLength={100} /></label>
              <label>Hjemmeside<input name="url" defaultValue={s.url ?? ""} placeholder="www.eksempel.dk" /></label>
              <label>Kort beskrivelse<input name="description" defaultValue={s.description ?? ""} maxLength={200} /></label>
              <label>Medlemsfordel<input name="discount" defaultValue={s.discount ?? ""} maxLength={80} placeholder="fx 10 % rabat" /></label>
              <label className="sp-wide">Detaljer kun for medlemmer (adresse, rabatkode)<textarea name="details" rows={2} defaultValue={s.details ?? ""} maxLength={1000} /></label>
              <label>Nyt logo (valgfrit)<input type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" /></label>
              <label className="check"><input type="checkbox" name="active" defaultChecked={s.active} /> Vis på forsiden</label>
              <button className="button small" type="submit">Gem</button>
            </form>
            <div className="sp-actions">
              <form action={moveSponsor}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="dir" value="op" />
                <button className="button small secondary" type="submit" disabled={i === 0} aria-label={`Flyt ${s.name} op`}>↑</button></form>
              <form action={moveSponsor}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="dir" value="ned" />
                <button className="button small secondary" type="submit" disabled={i === sponsors.length - 1} aria-label={`Flyt ${s.name} ned`}>↓</button></form>
              <form action={deleteSponsor}><input type="hidden" name="id" value={s.id} />
                <button className="linklike" type="submit">Slet</button></form>
            </div>
          </li>
        ))}
      </ul>

      <h2>Tilføj sponsor</h2>
      <form action={addSponsor} className="card stack">
        <div className="row">
          <label>Navn<input name="name" required maxLength={100} /></label>
          <label>Hjemmeside (valgfri)<input name="url" placeholder="www.eksempel.dk" /></label>
        </div>
        <div className="row">
          <label>Kort beskrivelse<input name="description" maxLength={200} /></label>
          <label>Medlemsfordel<input name="discount" maxLength={80} placeholder="fx 10 % rabat" /></label>
        </div>
        <label>Detaljer kun for medlemmer (adresse, rabatkode)<textarea name="details" rows={2} maxLength={1000} /></label>
        <label>Logo<input type="file" name="logo" required accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" /></label>
        <p className="muted" style={{ margin: 0 }}>Brug gerne et logo med hvid eller gennemsigtig baggrund, højst 300 KB.</p>
        <button className="button" type="submit" style={{ justifySelf: "start" }}>Tilføj</button>
      </form>
    </>
  );
}
