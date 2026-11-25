import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { DisciplineIcon } from "@/components/Icons";
import { formatTime, weekdayShort } from "@/lib/time";
import { kr } from "@/lib/format";
import { SponsorBar } from "@/components/SponsorBar";
import { AthleteCard } from "@/components/AthleteCard";
import { VISIBLE_ATHLETE } from "@/lib/athletes";
import { isOn } from "@/lib/features";
import { CLUB } from "@/lib/club";
import { teamNames, teamsFor } from "@/lib/visibility";
import { getHome } from "@/lib/site";
import { Inline } from "@/components/Inline";
import { getLocale, translator } from "@/lib/i18n";

// Forsiden er til nye medlemmer: hvad får jeg, passer det til mig, hvad koster det, og hvordan starter jeg.
// Logoet fører altid hertil; medlemmer, der er logget ind, får en knap til deres overblik i stedet for "Prøv gratis".

// Teksterne og billederne rettes under Admin → Klubben → Forside (standard i src/data/site-default.ts).

export default async function Home() {
  const session = await auth();
  const member = !!session?.user;
  const [teams, names] = await Promise.all([teamsFor(session?.user.id), teamNames()]);
  const loc = await getLocale();
  const t = translator(loc);
  const c = await getHome(loc);

  const now = new Date();
  const [types, week, featured] = await Promise.all([
    prisma.membershipType.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.trainingSession.findMany({
      where: { startsAt: { gte: now, lt: new Date(now.getTime() + 7 * 864e5) }, cancelledAt: null, teamId: { in: teams } },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, discipline: true, startsAt: true, teamId: true, location: true },
    }),
    prisma.athleteProfile.findMany({
      where: { ...VISIBLE_ATHLETE, featured: true },
      orderBy: { sortOrder: "asc" },
      take: 4,
      include: { user: { select: { name: true } } },
    }),
  ]);
  const adult = types.find((t) => t.code === "ADULT");

  return (
    <div className="landing">
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <p className="eyebrow">{CLUB.name}</p>
          <h1>{c.heroTitle}</h1>
          <p className="lead"><Inline text={c.heroLead} /></p>
          <div className="hero-actions">
            {member
              ? <Link href="/min-side" className="button big">{t("Gå til mit overblik", "Go to my overview")}</Link>
              : <Link href="/bliv-medlem" className="button big">{t("Prøv gratis i 14 dage", "Try free for 14 days")}</Link>}
          </div>
          {c.proof.length > 0 && (
            <ul className="lp-proof">
              {c.proof.map((f) => <li key={f.value + f.label}><b>{f.value}</b> {f.label}</li>)}
            </ul>
          )}
        </div>
        {c.heroImage && <img src={c.heroImage} alt={c.heroAlt} className="lp-hero-img" />}
      </section>

      <SponsorBar />

      <section id="traening" className="lp-section">
        <h2>{c.teamsTitle}</h2>
        <p className="lp-sub"><Inline text={c.teamsLead} /></p>
        <div className="lp-teams">
          {c.teams.map((t) => (
            <article key={t.title} className="lp-team">
              {t.img && <img src={t.img} alt={t.alt} loading="lazy" />}
              <div className="lp-team-body">
                {t.label && <span className="pill">{t.label}</span>}
                <h3>{t.title}</h3>
                <p><Inline text={t.text} /></p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {week.length > 0 && (
        <section className="lp-section">
          <h2>{t("Den næste uge i klubben", "The next week at the club")}</h2>
          <p className="lp-sub">{t("Sådan ser en helt almindelig uge ud. Som medlem tilmelder du dig med ét tryk.", "This is what an ordinary week looks like. As a member you sign up with one tap.")} <Link href="/traening">{t("Se hele kalenderen", "See the full calendar")}</Link></p>
          <ul className="lp-week">
            {week.slice(0, 8).map((t) => (
              <li key={t.id} className={`disc disc-${t.discipline}`}>
                <DisciplineIcon discipline={t.discipline} />
                <span className="lp-when"><b>{weekdayShort(t.startsAt, loc)}</b> {formatTime(t.startsAt, loc)}</span>
                <span className="lp-what">{t.title}<small>{t.location}</small></span>
                <span className="pill">{names.get(t.teamId ?? "")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.more.length > 0 && (
        <section className={`lp-section${c.moreImage ? " lp-split" : ""}`}>
          {c.moreImage && <img src={c.moreImage} alt="" loading="lazy" />}
          <div>
            <h2>{c.moreTitle}</h2>
            <ul className="lp-checks">
              {c.more.map((m) => <li key={m}><Inline text={m} /></li>)}
            </ul>
          </div>
        </section>
      )}

      {featured.length > 0 && (await isOn("atleter")) && (
        <section className="lp-section">
          <div className="section-head" style={{ margin: 0 }}>
            <h2>{t("Mød vores atleter", "Meet our athletes")}</h2>
            <Link href="/atleter">{t("Alle atleter →", "All athletes →")}</Link>
          </div>
          <p className="lp-sub"><Inline text={c.athletesLead} /></p>
          <div className="athlete-grid">
            {featured.map((a) => <AthleteCard key={a.id} a={a} />)}
          </div>
        </section>
      )}

      <section id="priser" className="lp-section">
        <h2>{t("Priser", "Prices")}</h2>
        <p className="lp-sub">{t("Ét kontingent om året. Ingen binding ud over det, og de første 14 dage er gratis.", "One fee per year. No commitment beyond that, and the first 14 days are free.")}</p>
        <div className="lp-prices">
          {types.map((t) => (
            <div key={t.id} className={`lp-price card${t.code === "ADULT" ? " featured" : ""}`}>
              <h3>{t.name}</h3>
              <p className="amount">{kr(t.priceOre, loc)}<small> / {loc === "en" ? "year" : "år"}</small></p>
              {t.description && <p className="muted">{t.description}</p>}
              <Link href="/bliv-medlem?plan=betal#meld-ind" className={`button${t.code === "ADULT" ? "" : " secondary"}`}>
                {t.code === "PASSIVE" ? (loc === "en" ? "Support the club" : "Støt klubben") : loc === "en" ? "Get started" : "Kom i gang"}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <h2>{t("Godt at vide", "Good to know")}</h2>
        <div className="lp-faq">
          {c.faq.map(({ q, a }) => (
            <details key={q}>
              <summary>{q}</summary>
              <p><Inline text={a} /></p>
            </details>
          ))}
        </div>
      </section>

      <section className="lp-cta">
        {c.ctaImage && <img src={c.ctaImage} alt="" />}
        <div>
          <h2>{c.ctaTitle}</h2>
          <p>{t(`Opret en profil på et minut, og prøv klubben gratis i 14 dage${adult ? `. Derefter ${kr(adult.priceOre)} om året` : ""}.`, `Create a profile in a minute and try the club free for 14 days${adult ? `. After that ${kr(adult.priceOre, loc)} per year` : ""}.`)}</p>
          <Link href="/bliv-medlem" className="button big">{t("Prøv gratis i 14 dage", "Try free for 14 days")}</Link>
        </div>
      </section>
    </div>
  );
}
