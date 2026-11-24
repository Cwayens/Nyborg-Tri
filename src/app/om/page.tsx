import Link from "next/link";
import { auth } from "@/auth";

export const metadata = {
  title: "Om klubben",
  description: "Nyborg Triathlon Klub blev stiftet i 2010. Læs om klubbens historie, stævnet NyborgTri 4-18-4 og hvordan du prøver at træne med.",
};

const TIMELINE: { year: string; title: string; text: React.ReactNode; img?: string }[] = [
  {
    year: "2007",
    title: "Et triathlonhold i svømmeklubben",
    text: "Nyborg Svømmeklub starter et triathlon-svømmehold i forbindelse med det årlige Nyborg Minitri. Holdet bliver det faste mødested for byens triathleter.",
  },
  {
    year: "2010",
    title: "Klubben stiftes den 2. september",
    text: "Svømmeholdet lukker, og i stedet stifter triathleterne deres egen klub: Nyborg Triathlon Klub, NyborgTri. Rolf Kjærby bliver den første formand og Michael Christensen næstformand.",
    img: "/billeder/historie/start-2010.webp",
  },
  {
    year: "Nov. 2010",
    title: "18 medlemmer og fast træning",
    text: "Efter to måneder er klubben på 18 medlemmer. Der svømmes om torsdagen, cykles om søndagen og løbes om mandagen, alt sammen i fælles flok.",
    img: "/billeder/historie/om-10.webp",
  },
  {
    year: "Hver august",
    title: "Stævnet NyborgTri 4-18-4",
    text: "Klubben arrangerer hvert år NyborgTri 4-18-4 (tidligere Nyborg Minitri), et stævne for både nye og erfarne triathleter.",
    img: "/billeder/historie/om-09.webp",
  },
  {
    year: "Hele året",
    title: "NyborgTri Cup og klubmesterskab",
    text: (
      <>
        En cup med flere afdelinger hen over året. Den med flest point bliver årets klubmester i klasserne kvinde, mand, pige og dreng.{" "}
        <Link href="/nyborgtri-cup-2027">Se NyborgTri Cup</Link>
      </>
    ),
  },
  {
    year: "I dag",
    title: "Plads til alle",
    text: (
      <>
        Børn, unge, motionister og elite træner sammen hver uge i svøm, cykel og løb. Se <Link href="/traening">træningskalenderen</Link> eller mød{" "}
        <Link href="/atleter">klubbens atleter</Link>.
      </>
    ),
  },
];

const PARTNERS = [
  { name: "Dansk Triathlon Forbund", what: "NyborgTri er medlem af DTriF, så du kan få licens og stille op til danske stævner.", url: "https://www.triatlon.dk/" },
  { name: "Idrætsforeninger i Nyborg", what: "NyborgTri samarbejder med byens andre klubber om baner, bassin og arrangementer.", url: null },
];

const GALLERY = [
  { src: "/billeder/open-water.jpg", alt: "Svømning i åbent vand" },
  { src: "/billeder/cykeltur.jpg", alt: "Fælles cykeltur" },
  { src: "/billeder/maalgang.jpg", alt: "Målgang ved stævne" },
  { src: "/billeder/enkeltstart.jpg", alt: "Enkeltstart på cykel" },
];

export default async function About() {
  const loggedIn = !!(await auth())?.user;
  return (
    <div className="about">
      <section className="about-hero">
        <div>
          <p className="about-kicker">Om klubben</p>
          <h1>Triathlon i Nyborg siden 2010</h1>
          <p className="about-lead">
            Nyborg Triathlon Klub er for alle med lyst til at svømme, cykle og løbe. Unge og gamle, begyndere og erfarne. Du er velkommen til at
            træne med, før du beslutter dig.
          </p>
          <div className="about-actions">
            {loggedIn ? <Link href="/kalender" className="button">Se træningskalenderen</Link> : <Link href="/bliv-medlem" className="button">Prøv gratis i 14 dage</Link>}
            <Link href="/om/kontakt" className="button secondary">Kontakt os</Link>
          </div>
        </div>
        <img src="/billeder/faellesskab-strand.jpg" alt="Medlemmer af NyborgTri på stranden" />
      </section>

      <ul className="about-facts" aria-label="Kort om klubben">
        <li><b>2010</b><span>stiftet 2. september</span></li>
        <li><b>3</b><span>discipliner, hver uge</span></li>
        <li><b>4-18-4</b><span>klubbens stævne i august</span></li>
        <li><b>DTriF</b><span>medlem af forbundet</span></li>
      </ul>

      <section>
        <h2>Historien</h2>
        <ol className="timeline">
          {TIMELINE.map((t) => (
            <li key={t.year + t.title}>
              <span className="timeline-year">{t.year}</span>
              <div className="card timeline-body">
                <div>
                  <h3>{t.title}</h3>
                  <p>{t.text}</p>
                </div>
                {t.img && <img src={t.img} alt="" loading="lazy" />}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="card about-archive">
        <a href="/billeder/historie/avisudklip-2010.webp" target="_blank" rel="noopener" className="about-clip">
          <img src="/billeder/historie/avisudklip-2010.webp" alt="Avisudklip fra Lokalavisen Nyborg 16. november 2010" loading="lazy" />
        </a>
        <div>
          <p className="about-kicker">Fra arkivet</p>
          <h2 style={{ marginTop: 0 }}>&quot;Svøm, løb og cykel i nystartet klub&quot;</h2>
          <p>Lokalavisen Nyborg skrev om den nye klub den 16. november 2010, to en halv måned efter stiftelsen.</p>
          <a href="/billeder/historie/avisudklip-2010.webp" target="_blank" rel="noopener">Læs hele artiklen</a>
        </div>
      </section>

      <section>
        <h2>Samarbejde</h2>
        <ul className="about-partners">
          {PARTNERS.map((p) => (
            <li key={p.name} className="card">
              <h3>{p.name}</h3>
              <p className="muted">{p.what}</p>
              {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer">{p.url.replace(/^https:\/\/(www\.)?|\/$/g, "")} ↗</a>}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Billeder</h2>
        <ul className="about-gallery">
          {GALLERY.map((g) => (
            <li key={g.src}><a href={g.src} target="_blank" rel="noopener"><img src={g.src} alt={g.alt} loading="lazy" /></a></li>
          ))}
        </ul>
      </section>

      <section className="about-cta">
        <div>
          <h2>Kom og prøv det</h2>
          <p>Træn gratis med i 14 dage. Du behøver ikke være i form eller have dyrt udstyr for at starte.</p>
        </div>
        <div className="about-actions">
          {loggedIn ? <Link href="/kalender" className="button">Find en træning</Link> : <Link href="/bliv-medlem" className="button">Prøv gratis</Link>}
          <Link href="/om/kontakt" className="button secondary">Spørg os først</Link>
        </div>
      </section>
    </div>
  );
}
