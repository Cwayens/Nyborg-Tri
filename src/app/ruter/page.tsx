import Link from "next/link";
import { mapsUrl } from "@/lib/club";
import { getClub } from "@/lib/site";
import { getHomePlace, getPlaces, getRoutes } from "@/lib/site";
import { RouteMap } from "@/components/RouteMap";
import { PinIcon } from "@/components/Icons";
import { requireFeature } from "@/lib/features";

export async function generateMetadata() {
  const CLUB = await getClub();
  return { title: "Ruter og træningssteder", description: `Kort over ${CLUB.name}s træningssteder og ruter. Hent ruterne som GPX til uret.` };
}

export default async function RoutesPage() {
  const CLUB = await getClub();
  await requireFeature("ruter");
  const [places, routes, home] = await Promise.all([getPlaces(), getRoutes(), getHomePlace()]);
  return (
    <div className="routes-page">
      <header>
        <h1>Ruter og træningssteder</h1>
        <p className="lead">
          {home && <>Vi har base i {home.name}, og herfra starter de fleste træninger. </>}Klik på en rute for at se den og hente den til uret.
        </p>
      </header>
      {home && <RouteMap places={places} routes={routes} home={home} />}
      <section>
        <h2>Træningssteder</h2>
        <ul className="contact-places">
          {places.map((p) => (
            <li key={p.id}>
              <a className={`card contact-place${p.home ? " home" : ""}`} href={mapsUrl(p.query, CLUB)} target="_blank" rel="noopener noreferrer">
                <span className="contact-icon"><PinIcon size={20} /></span>
                <span><b>{p.name}</b><small className="muted">{p.what}</small><span className="contact-map">Rutevejledning ↗</span></span>
              </a>
            </li>
          ))}
        </ul>
      </section>
      <p className="muted">
        Se hvornår vi træner i <Link href="/traening">kalenderen</Link>. Kortet er fra OpenStreetMap.
      </p>
    </div>
  );
}
