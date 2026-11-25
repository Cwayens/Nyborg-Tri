import Link from "next/link";
import { auth } from "@/auth";
import { getAbout } from "@/lib/site";
import { Inline } from "@/components/Inline";
import { getLocale, translator } from "@/lib/i18n";

export async function generateMetadata() {
  const loc = await getLocale();
  const a = await getAbout(loc);
  return { title: translator(loc)("Om klubben", "About the club"), description: a.lead.slice(0, 160) };
}

export default async function About() {
  const loggedIn = !!(await auth())?.user;
  const loc = await getLocale();
  const t = translator(loc);
  const a = await getAbout(loc);
  return (
    <div className="about">
      <section className="about-hero">
        <div>
          <p className="about-kicker">{t("Om klubben", "About the club")}</p>
          <h1>{a.title}</h1>
          <p className="about-lead"><Inline text={a.lead} /></p>
          <div className="about-actions">
            {loggedIn ? <Link href="/kalender" className="button">{t("Se træningskalenderen", "See the training calendar")}</Link> : <Link href="/bliv-medlem" className="button">{t("Prøv gratis i 14 dage", "Try free for 14 days")}</Link>}
            <Link href="/om/kontakt" className="button secondary">{t("Kontakt os", "Contact us")}</Link>
          </div>
        </div>
        {a.image && <img src={a.image} alt="" />}
      </section>

      {a.facts.length > 0 && (
        <ul className="about-facts" aria-label={t("Kort om klubben", "The club in brief")}>
          {a.facts.map((f) => <li key={f.value + f.label}><b>{f.value}</b><span>{f.label}</span></li>)}
        </ul>
      )}

      {a.timeline.length > 0 && (
        <section>
          <h2>{t("Historien", "Our story")}</h2>
          <ol className="timeline">
            {a.timeline.map((x) => (
              <li key={x.year + x.title}>
                <span className="timeline-year">{x.year}</span>
                <div className="card timeline-body">
                  <div>
                    <h3>{x.title}</h3>
                    <p><Inline text={x.text} /></p>
                  </div>
                  {x.img && <img src={x.img} alt="" loading="lazy" />}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {a.archive.show && a.archive.image && (
        <section className="card about-archive">
          <a href={a.archive.image} target="_blank" rel="noopener" className="about-clip">
            <img src={a.archive.image} alt={a.archive.title} loading="lazy" />
          </a>
          <div>
            <p className="about-kicker">{t("Fra arkivet", "From the archive")}</p>
            <h2 style={{ marginTop: 0 }}>{a.archive.title}</h2>
            <p><Inline text={a.archive.text} /></p>
            <a href={a.archive.image} target="_blank" rel="noopener">{t("Se det i fuld størrelse", "View full size")}</a>
          </div>
        </section>
      )}

      {a.partners.length > 0 && (
        <section>
          <h2>{t("Samarbejde", "Partners")}</h2>
          <ul className="about-partners">
            {a.partners.map((p) => (
              <li key={p.name} className="card">
                <h3>{p.name}</h3>
                <p className="muted"><Inline text={p.what} /></p>
                {/^https?:\/\//.test(p.url) && <a href={p.url} target="_blank" rel="noopener noreferrer">{p.url.replace(/^https?:\/\/(www\.)?|\/$/g, "")} ↗</a>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {a.gallery.length > 0 && (
        <section>
          <h2>{t("Billeder", "Photos")}</h2>
          <ul className="about-gallery">
            {a.gallery.map((g) => (
              <li key={g.src}><a href={g.src} target="_blank" rel="noopener"><img src={g.src} alt={g.alt} loading="lazy" /></a></li>
            ))}
          </ul>
        </section>
      )}

      <section className="about-cta">
        <div>
          <h2>{a.ctaTitle}</h2>
          <p><Inline text={a.ctaText} /></p>
        </div>
        <div className="about-actions">
          {loggedIn ? <Link href="/kalender" className="button">{t("Find en træning", "Find a training")}</Link> : <Link href="/bliv-medlem" className="button">{t("Prøv gratis", "Try for free")}</Link>}
          <Link href="/om/kontakt" className="button secondary">{t("Spørg os først", "Ask us first")}</Link>
        </div>
      </section>
    </div>
  );
}
