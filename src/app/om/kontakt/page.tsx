import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { CLUB, TOPICS, formatPhone, mapsUrl, telHref } from "@/lib/club";
import { getPlaces } from "@/lib/site";
import { MailIcon, PhoneIcon, PinIcon, initials } from "@/components/Icons";
import { sendContact } from "./actions";
import { isOn } from "@/lib/features";

export const metadata = { title: "Kontakt", description: `Skriv eller ring til ${CLUB.name}.` };

type Props = { searchParams: Promise<{ sendt?: string; fejl?: string; emne?: string }> };

export default async function Contact({ searchParams }: Props) {
  const sp = await searchParams;
  const places = await getPlaces();
  const [people, session] = await Promise.all([
    prisma.contactPerson.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    auth(),
  ]);
  const topic = (TOPICS as readonly string[]).includes(sp.emne ?? "") ? sp.emne : "";

  return (
    <div className="contact">
      <header className="contact-head">
        <h1>Kontakt</h1>
        <p className="lead">Har du spørgsmål om træning, medlemskab eller sponsorat? Skriv eller ring, så svarer vi hurtigst muligt.</p>
      </header>

      <section className="contact-quick" aria-label="Skriv eller ring">
        <a className="card contact-tile" href={`mailto:${CLUB.email}`}>
          <span className="contact-icon"><MailIcon size={22} /></span>
          <span><small className="muted">Skriv til os</small><b>{CLUB.email}</b></span>
        </a>
        {people.filter((p) => p.phone).slice(0, 1).map((p) => (
          <a key={p.id} className="card contact-tile" href={telHref(p.phone!)}>
            <span className="contact-icon"><PhoneIcon size={22} /></span>
            <span><small className="muted">Ring til {p.role.toLowerCase()} {p.name.split(" ")[0]}</small><b>{formatPhone(p.phone!)}</b></span>
          </a>
        ))}
      </section>

      {people.length > 0 && (
        <section>
          <h2>Kontaktpersoner</h2>
          <ul className="contact-people">
            {people.map((p) => (
              <li key={p.id} className="card contact-person">
                {p.photo ? <img src={p.photo} alt="" className="contact-photo" /> : <span className="contact-photo avatar">{initials(p.name)}</span>}
                <div>
                  <small className="muted">{p.role}</small>
                  <b>{p.name}</b>
                  <div className="contact-links">
                    {p.phone && <a href={telHref(p.phone)}><PhoneIcon size={16} /> {formatPhone(p.phone)}</a>}
                    {p.email && <a href={`mailto:${p.email}`}><MailIcon size={16} /> {p.email}</a>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {session?.user && <p><Link href="/om/bestyrelse">Se hele bestyrelsen</Link></p>}
        </section>
      )}

      <div className="contact-split">
        <section id="skriv" className="card contact-form">
          <h2 style={{ marginTop: 0 }}>Send en besked</h2>
          {sp.sendt ? (
            <p className="notice" role="status">Tak for din besked. Vi svarer på mail, så snart vi kan.</p>
          ) : (
            <form action={sendContact} className="stack">
              {sp.fejl && <p className="status-warn">{sp.fejl}</p>}
              <div className="row">
                <label>Navn<input name="name" required maxLength={100} autoComplete="name" /></label>
                <label>Mail<input name="email" type="email" required maxLength={200} autoComplete="email" /></label>
              </div>
              <div className="row">
                <label>Telefon (valgfri)<input name="phone" type="tel" maxLength={30} autoComplete="tel" /></label>
                <label>Emne
                  <select name="topic" defaultValue={topic}>
                    <option value="">Vælg emne</option>
                    {TOPICS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </label>
              </div>
              <label>Besked<textarea name="message" rows={5} required minLength={5} maxLength={4000} /></label>
              <label className="hp" aria-hidden="true">Lad feltet være tomt<input name="website" tabIndex={-1} autoComplete="off" /></label>
              <p className="muted small" style={{ margin: 0 }}>Vi bruger kun dine oplysninger til at svare dig.</p>
              <button className="button" type="submit" style={{ justifySelf: "start" }}>Send besked</button>
            </form>
          )}
        </section>

        <aside>
          <section className="card contact-try">
            <h2 className="h3" style={{ marginTop: 0 }}>Vil du prøve at træne med?</h2>
            <p>Du er velkommen til at træne gratis med i 14 dage, før du beslutter dig.</p>
            <Link href="/bliv-medlem" className="button">Prøv gratis</Link>
            <p className="muted small" style={{ marginBottom: 0 }}>Se hvornår vi træner i <Link href="/traening">kalenderen</Link>.</p>
          </section>
          <section className="card">
            <h2 className="h3" style={{ marginTop: 0 }}>Klubinfo</h2>
            <dl className="contact-info">
              <dt>Navn</dt><dd>{CLUB.name}</dd>
              <dt>CVR</dt><dd>{CLUB.cvr}</dd>
              <dt>Bank</dt><dd>{CLUB.bank}</dd>
              <dt>Facebook</dt><dd><a href={CLUB.facebook}>{CLUB.facebook.replace(/^https?:\/\/(www\.)?/, "")}</a></dd>
            </dl>
          </section>
        </aside>
      </div>

      {places.length > 0 && <section>
        <div className="section-head" style={{ margin: "0 0 14px" }}><h2 style={{ margin: 0 }}>Her træner vi</h2>{(await isOn("ruter")) && <Link href="/ruter">Se kort og ruter</Link>}</div>
        <ul className="contact-places">
          {places.map((p) => (
            <li key={p.id}>
              <a className="card contact-place" href={mapsUrl(p.query)} target="_blank" rel="noopener noreferrer">
                <span className="contact-icon"><PinIcon size={20} /></span>
                <span><b>{p.name}</b><small className="muted">{p.what}</small><span className="contact-map">Vis på kort ↗</span></span>
              </a>
            </li>
          ))}
        </ul>
      </section>}
    </div>
  );
}
