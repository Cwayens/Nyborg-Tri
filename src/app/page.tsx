import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { DisciplineIcon } from "@/components/Icons";
import { GROUP_LABEL } from "@/lib/roles";
import { formatTime, weekdayShort } from "@/lib/time";
import { kr } from "@/lib/format";
import { SponsorBar } from "@/components/SponsorBar";

// Forsiden er til nye medlemmer: hvad får jeg, passer det til mig, hvad koster det, og hvordan starter jeg.
// Logoet fører altid hertil; medlemmer, der er logget ind, får en knap til deres overblik i stedet for "Prøv gratis".

const TEAMS = [
  {
    group: "BREDDE",
    title: "Motionist eller nybegynder",
    text: "Træn i dit eget tempo med andre, der også vil have det sjovt. Du behøver ikke kunne crawle eller eje en racercykel for at starte.",
    img: "/billeder/cykeltur.jpg",
    alt: "Medlemmer på fælles cykeltur",
  },
  {
    group: "ELITE",
    title: "Du vil konkurrere",
    text: "Struktureret træning med trænere, tests og fælles mål mod sæsonens stævner, fra sprint til ironman.",
    img: "/billeder/enkeltstart.jpg",
    alt: "Klubbens atleter ved en enkeltstart",
  },
  {
    group: "BOERN",
    title: "Børn og unge",
    text: "Leg, teknik og fællesskab i vand, på cykel og til fods. Og så er der Nyborg MiniTri hver sommer.",
    img: "/billeder/maalgang.jpg",
    alt: "Publikum heier på en triatlet ved målgang på stranden",
  },
] as const;

const FAQ = [
  ["Skal jeg være i god form for at starte?", "Nej. Bredde-gruppen er for alle niveauer, og trænerne hjælper dig i gang med den disciplin, du er mindst tryg ved."],
  ["Hvad skal jeg have med første gang?", "Løbesko, badetøj og godt humør. Mangler du en cykel, kan du låne en af klubbens."],
  ["Hvordan fungerer de 14 gratis dage?", "Du opretter en profil og søger om prøveperiode. Når den er godkendt, kan du tilmelde dig alle din gruppes træninger i 14 dage uden at betale."],
  ["Kan jeg følge min træning?", "Ja. Forbind Strava, så tæller dine ture fra Garmin, Wahoo, Coros og andre ure med på din side, sammen med dine testresultater."],
] as const;

export default async function Home() {
  const member = !!(await auth())?.user;

  const now = new Date();
  const [types, week] = await Promise.all([
    prisma.membershipType.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.trainingSession.findMany({
      where: { startsAt: { gte: now, lt: new Date(now.getTime() + 7 * 864e5) }, cancelledAt: null },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, discipline: true, startsAt: true, group: true, location: true },
    }),
  ]);
  const adult = types.find((t) => t.code === "ADULT");

  return (
    <div className="landing">
      <section className="lp-hero">
        <img src="/billeder/faellesskab-strand.jpg" alt="" className="lp-hero-img" />
        <div className="lp-hero-inner wrap">
          <p className="eyebrow">Nyborg Triathlon Klub</p>
          <h1>Svøm, cykl og løb sammen med os på Østfyn</h1>
          <p className="lead">
            Uanset om du skal i mål på din første sprint eller jagter en ny rekord, så træner du bedre sammen med andre.
          </p>
          <div className="hero-actions">
            {member
              ? <Link href="/min-side" className="button big">Gå til mit overblik</Link>
              : <Link href="/bliv-medlem" className="button big">Prøv gratis i 14 dage</Link>}
          </div>
          <ul className="lp-proof">
            <li><b>ca. 100</b> medlemmer</li>
            <li><b>3</b> hold: Bredde, Elite og Børn</li>
            <li><b>Hver uge</b> fælles svøm, cykel og løb</li>
          </ul>
        </div>
      </section>

      <SponsorBar />

      <section id="traening" className="lp-section">
        <h2>Find dit hold</h2>
        <p className="lp-sub">Alle træner med folk på samme niveau. Du kan altid skifte hold senere.</p>
        <div className="lp-teams">
          {TEAMS.map((t) => (
            <article key={t.group} className="lp-team">
              <img src={t.img} alt={t.alt} loading="lazy" />
              <div className="lp-team-body">
                <span className="pill">{GROUP_LABEL[t.group]}</span>
                <h3>{t.title}</h3>
                <p>{t.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {week.length > 0 && (
        <section className="lp-section">
          <h2>Den næste uge i klubben</h2>
          <p className="lp-sub">Sådan ser en helt almindelig uge ud. Som medlem tilmelder du dig med ét tryk.</p>
          <ul className="lp-week">
            {week.slice(0, 8).map((t) => (
              <li key={t.id} className={`disc disc-${t.discipline}`}>
                <DisciplineIcon discipline={t.discipline} />
                <span className="lp-when"><b>{weekdayShort(t.startsAt)}</b> {formatTime(t.startsAt)}</span>
                <span className="lp-what">{t.title}<small>{t.location}</small></span>
                <span className="pill">{GROUP_LABEL[t.group]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="lp-section lp-split">
        <img src="/billeder/storebaelt.jpg" alt="Klubbens svømmere i våddragt i Storebælt" loading="lazy" />
        <div>
          <h2>Mere end træning</h2>
          <ul className="lp-checks">
            <li>Open water i Storebælt, lørdagsløb på Volden og fælles cykelture</li>
            <li>Klubbens egne stævner: NyborgTri Cup og Nyborg MiniTri</li>
            <li>Find nogen at træne med, også uden for de faste tider</li>
            <li>Se dine testresultater for 5 og 10 km, FTP og svøm, og følg din udvikling</li>
          </ul>
        </div>
      </section>

      <section id="priser" className="lp-section">
        <h2>Priser</h2>
        <p className="lp-sub">Ét kontingent om året. Ingen binding ud over det, og de første 14 dage er gratis.</p>
        <div className="lp-prices">
          {types.map((t) => (
            <div key={t.id} className={`lp-price card${t.code === "ADULT" ? " featured" : ""}`}>
              <h3>{t.name}</h3>
              <p className="amount">{kr(t.priceOre)}<small> / år</small></p>
              {t.description && <p className="muted">{t.description}</p>}
              <Link href="/bliv-medlem" className={`button${t.code === "ADULT" ? "" : " secondary"}`}>
                {t.code === "PASSIVE" ? "Støt klubben" : "Kom i gang"}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <h2>Godt at vide</h2>
        <div className="lp-faq">
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lp-cta">
        <img src="/billeder/open-water.jpg" alt="" />
        <div>
          <h2>Klar til første træning?</h2>
          <p>Opret en profil på et minut, og prøv klubben gratis i 14 dage{adult ? `. Derefter ${kr(adult.priceOre)} om året` : ""}.</p>
          <Link href="/bliv-medlem" className="button big">Prøv gratis i 14 dage</Link>
        </div>
      </section>
    </div>
  );
}
