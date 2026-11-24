import Link from "next/link";
import { requireAdmin } from "@/auth";
import { AdminNav } from "@/components/AdminNav";
import { AthletePhoto } from "@/components/AthleteCard";
import { prisma } from "@/lib/db";
import { dato } from "@/lib/format";
import { createProfile, deleteProfile, saveProfile } from "./actions";

export const metadata = { title: "Admin – atleter" };

export default async function AdminAthletes({ searchParams }: { searchParams: Promise<{ fejl?: string; gemt?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [profiles, elite, sponsors] = await Promise.all([
    prisma.athleteProfile.findMany({ orderBy: [{ featured: "desc" }, { sortOrder: "asc" }], include: { user: { select: { name: true, athleteGroup: true } }, sponsors: { select: { id: true } } } }),
    prisma.user.findMany({ where: { athleteGroup: "ELITE", athleteProfile: null, email: { not: { startsWith: "klubkammerat-" } } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.sponsor.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <h1>Atleter</h1>
      <AdminNav />
      <p className="muted">
        Fremhæv atleter fra Elite på den offentlige side <Link href="/atleter">/atleter</Link>. En profil vises først, når atleten selv har givet samtykke
        under Min profil → Min atletprofil. Fremhævede atleter vises også på forsiden.
      </p>
      {sp.fejl && <p className="status-warn">{sp.fejl}</p>}
      {sp.gemt && <p className="notice">Gemt.</p>}

      {elite.length > 0 && (
        <form action={createProfile} className="card row" style={{ alignItems: "end", marginBottom: 18 }}>
          <label>Ny atletprofil
            <select name="userId" required defaultValue="">
              <option value="" disabled>Vælg atlet fra Elite</option>
              {elite.map((u) => <option key={u.id} value={u.id}>{u.name ?? "Uden navn"}</option>)}
            </select>
          </label>
          <button className="button" type="submit">Opret profil</button>
        </form>
      )}

      <div className="stack">
        {profiles.map((p) => {
          const status = p.user.athleteGroup !== "ELITE" ? "Ikke længere i Elite" : !p.consentAt ? "Venter på atletens samtykke" : !p.published ? "Skjult" : "Synlig";
          return (
            <details key={p.id} className="card ath-admin" open={profiles.length <= 2}>
              <summary>
                <AthletePhoto a={p} className="ath-admin-img" />
                <span><b>{p.user.name}</b><small className="muted">{status}{p.featured ? " · fremhævet på forsiden" : ""}</small></span>
                {status === "Synlig" && <Link href={`/atleter/${p.slug}`}>Se profil</Link>}
              </summary>
              <form action={saveProfile} className="stack" style={{ marginTop: 12 }}>
                <input type="hidden" name="id" value={p.id} />
                <p className="muted" style={{ margin: 0 }}>
                  {p.consentAt ? `Samtykke givet ${dato(p.consentAt)}.` : "Atleten har ikke givet samtykke endnu. Profilen kan forberedes, men vises ikke."} Atleten kan selv rette tekst og billede.
                </p>
                <label>Overskrift<input name="headline" defaultValue={p.headline ?? ""} maxLength={120} placeholder="fx Ironman-atlet, AG 25-29" /></label>
                <label>Om atleten<textarea name="bio" rows={4} defaultValue={p.bio ?? ""} maxLength={3000} /></label>
                <div className="row">
                  <label>Mål for sæsonen (én pr. linje)<textarea name="goals" rows={3} defaultValue={p.goals ?? ""} /></label>
                  <label>Resultater (én pr. linje)<textarea name="results" rows={3} defaultValue={p.results ?? ""} /></label>
                </div>
                <div className="row">
                  <label>Profilbillede (højst 400 KB)<input type="file" name="photo" accept="image/png,image/jpeg,image/webp" /></label>
                  <label>Instagram<input name="instagram" defaultValue={p.instagram ?? ""} placeholder="@brugernavn" /></label>
                </div>
                {p.photo && <label className="check"><input type="checkbox" name="removePhoto" /> Fjern billede</label>}
                <fieldset className="ath-sponsors">
                  <legend>Atletens sponsorer</legend>
                  {sponsors.map((s) => (
                    <label key={s.id} className="check"><input type="checkbox" name="sponsor" value={s.id} defaultChecked={p.sponsors.some((x) => x.id === s.id)} /> {s.name}</label>
                  ))}
                  <small className="muted">Nye sponsorer oprettes under <Link href="/admin/sponsorer">Sponsorer</Link>.</small>
                </fieldset>
                <div className="row" style={{ alignItems: "center" }}>
                  <label className="check"><input type="checkbox" name="published" defaultChecked={p.published} /> Vis på siden</label>
                  <label className="check"><input type="checkbox" name="featured" defaultChecked={p.featured} /> Fremhæv på forsiden</label>
                  <label>Rækkefølge<input type="number" name="sortOrder" defaultValue={p.sortOrder} style={{ width: 90 }} /></label>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button className="button" type="submit">Gem</button>
                </div>
              </form>
              <form action={deleteProfile} style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={p.id} />
                <button className="linklike" type="submit">Slet profil</button>
              </form>
            </details>
          );
        })}
      </div>
    </>
  );
}
