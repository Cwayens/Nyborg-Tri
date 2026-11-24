import Link from "next/link";
import { CLUB } from "@/lib/club";

export const metadata = {
  title: "Privatlivspolitik",
  description: "Sådan behandler Nyborg Triathlon Klub dine personoplysninger: hvad vi gemmer, hvorfor, hvor længe og dine rettigheder.",
};

// Gennemgås af bestyrelsen før lancering (se docs/go-live-tjekliste.md). Opdater datoen ved ændringer.
const UPDATED = "24. november 2026";

const DATA: [string, string, string, string][] = [
  ["Medlemskab", "Navn, mail, telefon, fødselsdato, adresse og medlemstype", "For at kunne have dig som medlem og opkræve kontingent (aftale)", "Indtil du sletter din profil. Bestyrelsen rydder op i tidligere medlemmer én gang om året"],
  ["Forælder eller værge", "Navn og mail på forælder til medlemmer under 18 år", "Betalingslink, kvitteringer og vigtige beskeder (aftale)", "Som medlemmet"],
  ["Betalinger", "Beløb, dato, medlemstype og betalingsreference. Kortoplysninger gemmes kun hos Stripe, aldrig hos os", "Bogføringsloven (retlig forpligtelse)", "5 år efter regnskabsårets udløb"],
  ["Træning", "Tilmeldinger til træninger og Træn sammen-ture", "Så trænerne ved, hvem der kommer (legitim interesse)", "Som medlemmet"],
  ["Data fra dit ur", "Træninger fra Strava eller andre forbundne tjenester: sport, tid, distance, puls og watt, samt bedste præstationer udregnet heraf", "Kun hvis du selv forbinder dit ur (samtykke)", "Indtil du afbryder forbindelsen eller sletter din profil"],
  ["Vægt", "Din vægt, hvis du skriver den", "Til at udregne FTP i watt pr. kg (samtykke). Andre ser kun W/kg, aldrig vægten", "Indtil du fjerner den"],
  ["Leaderboard og klubstatistik", "Navn, aldersgruppe, klasse og bedste præstationer eller træningstimer", "Kun hvis du selv slår det til (samtykke)", "Indtil du slår det fra"],
  ["Chat", "Dine beskeder i klubbens chat", "Kommunikation i klubben (legitim interesse). Børns chat kan læses af trænere", "Indtil du sletter dem eller din profil"],
  ["Atletprofil", "Billede, tekst, resultater og sponsorer på den offentlige atletside", "Kun med dit samtykke, som du kan trække tilbage", "Indtil du trækker samtykket tilbage"],
  ["Kontaktformular", "Navn, mail, telefon og din besked", "For at kunne svare dig (legitim interesse)", "1 år"],
];

export default function Privacy() {
  return (
    <article className="policy">
      <p className="about-kicker">Senest opdateret {UPDATED}</p>
      <h1>Privatlivspolitik</h1>
      <p className="lead">
        Vi passer på dine oplysninger. Her kan du læse, hvad vi gemmer om dig, hvorfor, hvem der ellers ser det, og hvordan du får indsigt i
        eller sletter dine data.
      </p>
      <nav className="policy-toc" aria-label="Indhold">
        <a href="#ansvarlig">Dataansvarlig</a><a href="#data">Hvad vi gemmer</a><a href="#modtagere">Hvem der ser det</a>
        <a href="#cookies">Cookies</a><a href="#boern">Børn</a><a href="#rettigheder">Dine rettigheder</a>
      </nav>

      <h2 id="ansvarlig">Dataansvarlig</h2>
      <p>
        {CLUB.name}, CVR {CLUB.cvr}, er dataansvarlig. Har du spørgsmål, så skriv til <a href={`mailto:${CLUB.email}`}>{CLUB.email}</a> eller
        brug <Link href="/om/kontakt">kontaktsiden</Link>.
      </p>

      <h2 id="data">Hvad vi gemmer, hvorfor og hvor længe</h2>
      <table>
        <thead><tr><th>Område</th><th>Oplysninger</th><th>Formål og grundlag</th><th>Opbevaring</th></tr></thead>
        <tbody>{DATA.map(([a, b, c, d]) => <tr key={a}><td>{a}</td><td>{b}</td><td>{c}</td><td>{d}</td></tr>)}</tbody>
      </table>
      <p className="muted">Grundlaget er databeskyttelsesforordningens art. 6, stk. 1: b (aftale), c (retlig forpligtelse), f (legitim interesse) og a (samtykke).</p>

      <h2 id="modtagere">Hvem der ser dine oplysninger</h2>
      <ul>
        <li><b>Andre medlemmer</b> ser dit navn, når du er tilmeldt en træning, i chatten og på leaderboardet, hvis du har slået det til.</li>
        <li><b>Trænere og bestyrelse</b> ser kontaktoplysninger og tilmeldinger for at kunne afvikle træning og medlemskab.</li>
        <li><b>Offentligheden</b> ser kun atletprofiler, som atleten selv har godkendt. Data fra ure vises aldrig offentligt.</li>
        <li>
          <b>Leverandører, der behandler data for os:</b> hosting af hjemmesiden og databasen, Stripe (betaling), vores mailudbyder og vores
          billedlager. De må kun bruge oplysningerne til at levere deres tjeneste til os.
        </li>
        <li><b>Strava og andre ur-tjenester</b>, men kun hvis du selv forbinder dem. Du kan afbryde forbindelsen når som helst under Ure og apps.</li>
      </ul>
      <p>Vi sælger aldrig dine oplysninger og bruger dem ikke til reklame.</p>

      <h2 id="cookies">Cookies</h2>
      <p>
        Vi bruger kun én nødvendig cookie, som holder dig logget ind. Vi bruger ingen statistik- eller reklamecookies, og derfor beder vi dig
        heller ikke om samtykke til cookies.
      </p>

      <h2 id="boern">Børn og unge</h2>
      <p>
        For medlemmer under 18 år gemmer vi også en forælders navn og mail. Forælderen får betalingslink og kvitteringer. Børn kan kun chatte
        med andre børn, og trænerne kan læse med.
      </p>

      <h2 id="rettigheder">Dine rettigheder</h2>
      <ul>
        <li><b>Indsigt og dataportabilitet:</b> hent alle dine data som en fil under <Link href="/profil#slet">Min profil</Link>.</li>
        <li><b>Berigtigelse:</b> ret dine oplysninger på din profil, eller skriv til os.</li>
        <li><b>Sletning:</b> slet din profil under <Link href="/profil#slet">Min profil</Link>. Betalinger gemmes dog i 5 år uden navn og mail.</li>
        <li><b>Træk samtykke tilbage:</b> slå deling, leaderboard og ur-forbindelser fra under <Link href="/forbindelser">Ure og apps</Link>.</li>
        <li><b>Indsigelse og begrænsning:</b> skriv til os, så svarer vi inden for en måned.</li>
      </ul>
      <p>
        Er du utilfreds med, hvordan vi behandler dine oplysninger, kan du klage til Datatilsynet på{" "}
        <a href="https://www.datatilsynet.dk" target="_blank" rel="noopener noreferrer">datatilsynet.dk</a>.
      </p>
    </article>
  );
}
