import Link from "next/link";
import { HOME, PLACES, mapsUrl } from "@/lib/club";
import { ROUTES } from "@/lib/routes";
import { RouteMap } from "@/components/RouteMap";
import { PinIcon } from "@/components/Icons";

export const metadata = {
  title: "Ruter og træningssteder",
  description: "Kort over Nyborg Triathlon Klubs træningssteder og ruter: løb på volden, MTB-ruten, cykelture og NyborgTri 4-18-4. Hent ruterne som GPX.",
};

export default function RoutesPage() {
  return (
    <div className="routes-page">
      <header>
        <h1>Ruter og træningssteder</h1>
        <p className="lead">
          Vi har base i Nyborg Idræts- og Fritidscenter, og herfra starter de fleste træninger. Klik på en rute for at se den og hente den til uret.
        </p>
      </header>
      <RouteMap places={PLACES} routes={ROUTES} home={HOME} />
      <section>
        <h2>Træningssteder</h2>
        <ul className="contact-places">
          {PLACES.map((p) => (
            <li key={p.id}>
              <a className={`card contact-place${p.home ? " home" : ""}`} href={mapsUrl(p.query)} target="_blank" rel="noopener noreferrer">
                <span className="contact-icon"><PinIcon size={20} /></span>
                <span><b>{p.name}</b><small className="muted">{p.what}</small><span className="contact-map">Rutevejledning ↗</span></span>
              </a>
            </li>
          ))}
        </ul>
      </section>
      <p className="muted">
        Se hvornår vi træner i <Link href="/traening">kalenderen</Link>. Ruterne er hentet fra den gamle hjemmeside. Kortet er fra OpenStreetMap.
      </p>
    </div>
  );
}
