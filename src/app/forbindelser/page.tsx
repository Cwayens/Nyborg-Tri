import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { dato } from "@/lib/format";
import { PROVIDERS, providerConfigured } from "@/lib/wearables/providers";
import { disconnectStrava, newCalendarLink, setSharing, syncStrava } from "./actions";

export const metadata = { title: "Ure, apps og kalender" };

type Props = { searchParams: Promise<{ fejl?: string; hentet?: string; forbundet?: string }> };

export default async function Connections({ searchParams }: Props) {
  const sessionUser = await requireUser("/forbindelser");
  const { fejl, hentet, forbundet } = await searchParams;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id }, include: { wearableConnections: true } });
  const strava = user.wearableConnections.find((c) => c.provider === "STRAVA");
  const base = process.env.AUTH_URL ?? "";
  const calUrl = user.calendarToken ? `${base}/api/kalender/${user.calendarToken}.ics` : null;

  return (
    <>
      <h1>Ure, apps og kalender</h1>
      {fejl && <p className="status-warn">{fejl}</p>}
      {forbundet && <p className="notice">Strava er forbundet. {hentet ?? 0} aktiviteter er hentet, og nye kommer automatisk.</p>}
      {hentet && !forbundet && <p className="notice">{hentet} aktiviteter opdateret fra Strava.</p>}

      <h2>Træningsdata</h2>
      <div className="grid two">
        {PROVIDERS.map((p) => {
          const live = providerConfigured(p);
          return (
            <section key={p.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>{p.name}</h3>
                {p.id === "STRAVA" && strava ? <span className="pill ok">Forbundet</span>
                  : live ? <span className="pill">Klar</span>
                  : <span className="pill">{p.status === "live" ? "Afventer opsætning" : "Kommer"}</span>}
              </div>
              <p className="muted" style={{ fontSize: "0.92rem" }}>{p.note}</p>
              {p.id === "STRAVA" && (strava ? (
                <>
                  <p style={{ fontSize: "0.9rem" }}>Sidst hentet: {strava.lastSyncAt ? dato(strava.lastSyncAt) : "aldrig"}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <form action={syncStrava}><button className="button small secondary" type="submit">Hent nu</button></form>
                    <form action={disconnectStrava}><button className="button small ghost" type="submit">Afbryd og slet data</button></form>
                  </div>
                </>
              ) : live ? (
                <a href="/api/wearables/strava/connect" className="button small" style={{ background: "#fc4c02" }}>Forbind med Strava</a>
              ) : null)}
            </section>
          );
        })}
      </div>

      <h2>Del med klubben</h2>
      <section className="card">
        <form action={setSharing} className="stack" style={{ maxWidth: "100%" }}>
          <label className="check" style={{ alignItems: "flex-start" }}>
            <input type="checkbox" name="share" defaultChecked={user.shareActivities} style={{ marginTop: 5 }} />
            <span>
              <strong>Vis mine træningstimer i klubstatistikken</strong>
              <br /><span className="muted">Andre medlemmer kan se dit navn og dine samlede timer/km pr. sport. Enkelte aktiviteter, puls og ruter vises ikke. Aktiviteter fra Strava tæller kun i din egen statistik, fordi Stravas vilkår ikke tillader at vise dem for andre.</span>
            </span>
          </label>
          <button className="button small secondary" type="submit" style={{ justifySelf: "start" }}>Gem</button>
        </form>
      </section>

      <h2>Kalender på telefonen</h2>
      <section className="card">
        <p>Abonnér på dine træninger i Google Kalender, Apple Kalender eller Outlook. Kalenderen opdateres automatisk med din gruppes træninger, dine tilmeldinger og Træn sammen-ture.</p>
        {calUrl ? (
          <>
            <input readOnly value={calUrl} aria-label="Kalenderlink" />
            <p className="muted" style={{ fontSize: "0.9rem" }}>
              Kopiér linket og vælg &quot;Tilføj kalender fra URL&quot; (Google) eller &quot;Ny kalenderabonnement&quot; (Apple). Del ikke linket med andre.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a className="button small" href={calUrl.replace(/^https?:/, "webcal:")}>Åbn i kalender-app</a>
              <form action={newCalendarLink}><button className="button small ghost" type="submit">Lav nyt link (det gamle stopper)</button></form>
            </div>
          </>
        ) : (
          <form action={newCalendarLink}><button className="button small" type="submit">Lav mit kalenderlink</button></form>
        )}
      </section>
    </>
  );
}
