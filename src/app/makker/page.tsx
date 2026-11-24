import Link from "next/link";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { requireFeature } from "@/lib/features";
import { DISCIPLINE_LABEL } from "@/lib/roles";
import { TIMES, matchBuddy, minSec, type Time } from "@/lib/buddy";
import { DisciplineIcon, initials } from "@/components/Icons";
import { removeBuddy, saveBuddy } from "./actions";
import { CLUB } from "@/lib/club";

export const metadata = { title: "Find en makker" };

export default async function Buddies({ searchParams }: { searchParams: Promise<{ gemt?: string; fejl?: string; ret?: string }> }) {
  const user = await requireUser("/makker");
  await requireFeature("makker");
  const { gemt, fejl, ret } = await searchParams;
  const mine = await prisma.buddyProfile.findUnique({ where: { userId: user.id } });
  const others = mine
    ? await prisma.buddyProfile.findMany({ where: { userId: { not: user.id }, user: { deletedAt: null } }, include: { user: { select: { name: true, email: true } } } })
    : [];
  const matches = mine
    ? others.map((o) => ({ o, m: matchBuddy(mine, o) })).filter((x) => x.m.score > 0).sort((a, b) => b.m.score - a.m.score).slice(0, 20)
    : [];
  const editing = !mine || !!ret;

  return (
    <>
      <h1>Find en makker</h1>
      <p className="muted" style={{ marginTop: -8 }}>
        Det er sjovere og nemmere at komme ud af døren sammen. Fortæl hvad du træner, i hvilket tempo og hvornår, så finder vi klubkammerater, der passer.
      </p>
      {gemt && <p className="notice">Din makkerprofil er gemt.</p>}
      {fejl && <p className="status-warn">{fejl}</p>}

      {editing ? (
        <form action={saveBuddy} className="card stack buddy-form">
          <h2 className="h3" style={{ margin: 0 }}>{mine ? "Ret din makkerprofil" : "Lav din makkerprofil"}</h2>
          <fieldset>
            <legend>Hvad vil du træne med andre?</legend>
            {(["RUN", "BIKE", "SWIM"] as const).map((d) => (
              <label key={d} className="check"><input type="checkbox" name={`d_${d}`} defaultChecked={mine?.disciplines.includes(d)} /> {DISCIPLINE_LABEL[d]}</label>
            ))}
          </fieldset>
          <div className="row">
            <label>Rolig løbefart (min/km)<input name="runPace" placeholder="fx 5:45" defaultValue={minSec(mine?.runPace ?? null)} inputMode="numeric" /></label>
            <label>Rolig cykelfart (km/t)<input name="bikeSpeed" placeholder="fx 27" defaultValue={mine?.bikeSpeed ?? ""} inputMode="numeric" /></label>
            <label>Svøm (min/100 m)<input name="swimPace" placeholder="fx 2:05" defaultValue={minSec(mine?.swimPace ?? null)} inputMode="numeric" /></label>
          </div>
          <fieldset>
            <legend>Hvornår kan du?</legend>
            {(Object.keys(TIMES) as Time[]).map((t) => (
              <label key={t} className="check"><input type="checkbox" name={`t_${t}`} defaultChecked={mine?.times.includes(t)} /> {TIMES[t]}</label>
            ))}
          </fieldset>
          <label>Kort om dig (valgfrit)<input name="note" maxLength={200} defaultValue={mine?.note ?? ""} placeholder="fx Træner op til min første sprint, løber gerne langtur søndag" /></label>
          <p className="muted" style={{ margin: 0 }}>Dit navn, din mail og profilen her kan ses af andre medlemmer med en makkerprofil. Du kan slette den når som helst.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="button" type="submit">Gem og find makkere</button>
            {mine && <Link href="/makker" className="button ghost">Annullér</Link>}
          </div>
        </form>
      ) : (
        <div className="card buddy-me">
          <span>
            <b>Din profil:</b> {mine!.disciplines.map((d) => DISCIPLINE_LABEL[d]).join(", ")}
            {mine!.runPace ? ` · løb ${minSec(mine!.runPace)} /km` : ""}{mine!.bikeSpeed ? ` · cykel ${mine!.bikeSpeed} km/t` : ""}{mine!.swimPace ? ` · svøm ${minSec(mine!.swimPace)} /100 m` : ""}
            {mine!.times.length ? ` · ${mine!.times.map((t) => TIMES[t as Time]).join(", ")}` : ""}
          </span>
          <span style={{ display: "flex", gap: 12 }}>
            <Link href="/makker?ret=1">Ret</Link>
            <form action={removeBuddy}><button className="linklike" type="submit">Slet profil</button></form>
          </span>
        </div>
      )}

      {mine && (
        <>
          <h2>{matches.length ? `${matches.length} ${matches.length === 1 ? "makker passer" : "makkere passer"} til dig` : "Ingen makkere endnu"}</h2>
          {matches.length === 0 && (
            <p className="card empty">Der er ingen med samme sport og tempo endnu. Prøv at <Link href="/traen-sammen?ny=1">slå en tur op</Link>, så kan andre hoppe med.</p>
          )}
          <div className="buddy-grid">
            {matches.map(({ o, m }) => (
              <article key={o.userId} className="card buddy">
                <header>
                  <span className="avatar">{initials(o.user.name)}</span>
                  <div>
                    <b>{o.user.name ?? "Medlem"}</b>
                    <div className="muted">{m.times.length ? m.times.map((t) => TIMES[t as Time]).join(", ") : "Ingen fælles tidspunkter"}</div>
                  </div>
                </header>
                <ul className="buddy-sports">
                  {m.sports.map((d) => (
                    <li key={d}>
                      <DisciplineIcon discipline={d} size={16} /> {DISCIPLINE_LABEL[d]}
                      <span className="muted">
                        {d === "RUN" && o.runPace ? ` ${minSec(o.runPace)} /km` : ""}
                        {d === "BIKE" && o.bikeSpeed ? ` ${o.bikeSpeed} km/t` : ""}
                        {d === "SWIM" && o.swimPace ? ` ${minSec(o.swimPace)} /100 m` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                {o.note && <p className="buddy-note">“{o.note}”</p>}
                <div className="buddy-actions">
                  <a className="button small" href={`mailto:${o.user.email}?subject=${encodeURIComponent(`Skal vi træne sammen? (${CLUB.shortName})`)}`}>Skriv</a>
                  <Link className="button small ghost" href="/traen-sammen?ny=1">Slå en tur op</Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}
