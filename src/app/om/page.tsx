import Link from "next/link";
import { auth } from "@/auth";
import { getAbout } from "@/lib/site";
import { Inline } from "@/components/Inline";

export async function generateMetadata() {
  const a = await getAbout();
  return { title: "Om klubben", description: a.lead.slice(0, 160) };
}

export default async function About() {
  const loggedIn = !!(await auth())?.user;
  const a = await getAbout();
  return (
    <div className="about">
      <section className="about-hero">
        <div>
          <p className="about-kicker">Om klubben</p>
          <h1>{a.title}</h1>
          <p className="about-lead"><Inline text={a.lead} /></p>
          <div className="about-actions">
            {loggedIn ? <Link href="/kalender" className="button">Se træningskalenderen</Link> : <Link href="/bliv-medlem" className="button">Prøv gratis i 14 dage</Link>}
            <Link href="/om/kontakt" className="button secondary">Kontakt os</Link>
          </div>
        </div>
        {a.image && <img src={a.image} alt="" />}
      </section>

      {a.facts.length > 0 && (
        <ul className="about-facts" aria-label="Kort om klubben">
          {a.facts.map((f) => <li key={f.value + f.label}><b>{f.value}</b><span>{f.label}</span></li>)}
        </ul>
      )}

      {a.timeline.length > 0 && (
        <section>
          <h2>Historien</h2>
          <ol className="timeline">
            {a.timeline.map((t) => (
              <li key={t.year + t.title}>
                <span className="timeline-year">{t.year}</span>
                <div className="card timeline-body">
                  <div>
                    <h3>{t.title}</h3>
                    <p><Inline text={t.text} /></p>
                  </div>
                  {t.img && <img src={t.img} alt="" loading="lazy" />}
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
            <p className="about-kicker">Fra arkivet</p>
            <h2 style={{ marginTop: 0 }}>{a.archive.title}</h2>
            <p><Inline text={a.archive.text} /></p>
            <a href={a.archive.image} target="_blank" rel="noopener">Se det i fuld størrelse</a>
          </div>
        </section>
      )}

      {a.partners.length > 0 && (
        <section>
          <h2>Samarbejde</h2>
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
          <h2>Billeder</h2>
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
          {loggedIn ? <Link href="/kalender" className="button">Find en træning</Link> : <Link href="/bliv-medlem" className="button">Prøv gratis</Link>}
          <Link href="/om/kontakt" className="button secondary">Spørg os først</Link>
        </div>
      </section>
    </div>
  );
}
