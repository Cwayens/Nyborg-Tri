import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { TOPICS, formatPhone, mapsUrl, telHref } from "@/lib/club";
import { getClub } from "@/lib/site";
import { getPlaces } from "@/lib/site";
import { MailIcon, PhoneIcon, PinIcon, initials } from "@/components/Icons";
import { sendContact } from "./actions";
import { isOn } from "@/lib/features";
import { getLocale, translator } from "@/lib/i18n";

export async function generateMetadata() {
  const CLUB = await getClub();
  const t = translator(await getLocale());
  return { title: t("Kontakt", "Contact"), description: t(`Skriv eller ring til ${CLUB.name}.`, `Write to or call ${CLUB.name}.`) };
}

type Props = { searchParams: Promise<{ sendt?: string; fejl?: string; emne?: string }> };

export default async function Contact({ searchParams }: Props) {
  const CLUB = await getClub();
  const sp = await searchParams;
  const places = await getPlaces();
  const [people, session] = await Promise.all([
    prisma.contactPerson.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    auth(),
  ]);
  const t = translator(await getLocale());
  const topic = (TOPICS as readonly string[]).includes(sp.emne ?? "") ? sp.emne : "";

  return (
    <div className="contact">
      <header className="contact-head">
        <h1>{t("Kontakt", "Contact")}</h1>
        <p className="lead">{t("Har du spørgsmål om træning, medlemskab eller sponsorat? Skriv eller ring, så svarer vi hurtigst muligt.", "Questions about training, membership or sponsorship? Write or call and we will get back to you as soon as we can.")}</p>
      </header>

      <section className="contact-quick" aria-label={t("Skriv eller ring", "Write or call")}>
        <a className="card contact-tile" href={`mailto:${CLUB.email}`}>
          <span className="contact-icon"><MailIcon size={22} /></span>
          <span><small className="muted">{t("Skriv til os", "Write to us")}</small><b>{CLUB.email}</b></span>
        </a>
        {people.filter((p) => p.phone).slice(0, 1).map((p) => (
          <a key={p.id} className="card contact-tile" href={telHref(p.phone!)}>
            <span className="contact-icon"><PhoneIcon size={22} /></span>
            <span><small className="muted">{t("Ring til", "Call")} {p.role.toLowerCase()} {p.name.split(" ")[0]}</small><b>{formatPhone(p.phone!)}</b></span>
          </a>
        ))}
      </section>

      {people.length > 0 && (
        <section>
          <h2>{t("Kontaktpersoner", "Contact people")}</h2>
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
          {session?.user && <p><Link href="/om/bestyrelse">{t("Se hele bestyrelsen", "See the whole board")}</Link></p>}
        </section>
      )}

      <div className="contact-split">
        <section id="skriv" className="card contact-form">
          <h2 style={{ marginTop: 0 }}>{t("Send en besked", "Send a message")}</h2>
          {sp.sendt ? (
            <p className="notice" role="status">{t("Tak for din besked. Vi svarer på mail, så snart vi kan.", "Thanks for your message. We will reply by email as soon as we can.")}</p>
          ) : (
            <form action={sendContact} className="stack">
              {sp.fejl && <p className="status-warn">{sp.fejl}</p>}
              <div className="row">
                <label>{t("Navn", "Name")}<input name="name" required maxLength={100} autoComplete="name" /></label>
                <label>{t("Mail", "Email")}<input name="email" type="email" required maxLength={200} autoComplete="email" /></label>
              </div>
              <div className="row">
                <label>{t("Telefon (valgfri)", "Phone (optional)")}<input name="phone" type="tel" maxLength={30} autoComplete="tel" /></label>
                <label>{t("Emne", "Topic")}
                  <select name="topic" defaultValue={topic}>
                    <option value="">{t("Vælg emne", "Choose a topic")}</option>
                    {TOPICS.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </label>
              </div>
              <label>{t("Besked", "Message")}<textarea name="message" rows={5} required minLength={5} maxLength={4000} /></label>
              <label className="hp" aria-hidden="true">Lad feltet være tomt<input name="website" tabIndex={-1} autoComplete="off" /></label>
              <p className="muted small" style={{ margin: 0 }}>{t("Vi bruger kun dine oplysninger til at svare dig.", "We only use your details to reply to you.")}</p>
              <button className="button" type="submit" style={{ justifySelf: "start" }}>{t("Send besked", "Send message")}</button>
            </form>
          )}
        </section>

        <aside>
          <section className="card contact-try">
            <h2 className="h3" style={{ marginTop: 0 }}>{t("Vil du prøve at træne med?", "Want to try training with us?")}</h2>
            <p>{t("Du er velkommen til at træne gratis med i 14 dage, før du beslutter dig.", "You are welcome to train with us for free for 14 days before you decide.")}</p>
            <Link href="/bliv-medlem" className="button">{t("Prøv gratis", "Try for free")}</Link>
            <p className="muted small" style={{ marginBottom: 0 }}>{t("Se hvornår vi træner i", "See when we train in the")} <Link href="/traening">{t("kalenderen", "calendar")}</Link>.</p>
          </section>
          <section className="card">
            <h2 className="h3" style={{ marginTop: 0 }}>{t("Klubinfo", "Club info")}</h2>
            <dl className="contact-info">
              <dt>{t("Navn", "Name")}</dt><dd>{CLUB.name}</dd>
              <dt>CVR</dt><dd>{CLUB.cvr}</dd>
              <dt>Bank</dt><dd>{CLUB.bank}</dd>
              <dt>Facebook</dt><dd><a href={CLUB.facebook}>{CLUB.facebook.replace(/^https?:\/\/(www\.)?/, "")}</a></dd>
            </dl>
          </section>
        </aside>
      </div>

      {places.length > 0 && <section>
        <div className="section-head" style={{ margin: "0 0 14px" }}><h2 style={{ margin: 0 }}>{t("Her træner vi", "Where we train")}</h2>{(await isOn("ruter")) && <Link href="/ruter">{t("Se kort og ruter", "See map and routes")}</Link>}</div>
        <ul className="contact-places">
          {places.map((p) => (
            <li key={p.id}>
              <a className="card contact-place" href={mapsUrl(p.query, CLUB)} target="_blank" rel="noopener noreferrer">
                <span className="contact-icon"><PinIcon size={20} /></span>
                <span><b>{p.name}</b><small className="muted">{p.what}</small><span className="contact-map">{t("Vis på kort ↗", "Show on map ↗")}</span></span>
              </a>
            </li>
          ))}
        </ul>
      </section>}
    </div>
  );
}
