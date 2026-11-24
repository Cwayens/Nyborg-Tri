import Link from "next/link";
import { MailIcon } from "@/components/Icons";

export const metadata = { title: "Tjek din mail", robots: { index: false } };

type Props = { searchParams: Promise<{ findes?: string; betalingsfejl?: string; proeve?: string; foraelder?: string; betalt?: string }> };

export default async function CheckMail({ searchParams }: Props) {
  const sp = await searchParams;
  const title = sp.betalt ? "Tak, du er nu medlem!" : sp.proeve ? "Tak for din ansøgning!" : sp.foraelder ? "Betalingslinket er sendt" : "Tjek din mail";
  return (
    <div className="card empty notfound">
      <span className="contact-icon" style={{ margin: "0 auto 12px" }}><MailIcon size={22} /></span>
      <h1>{title}</h1>
      {sp.betalt && <p>Din betaling er modtaget. Vi har sendt dig en mail med et login-link, så du kan tilmelde dig træninger.</p>}
      {sp.proeve && <p>Vi har sendt dig en mail med et login-link. Bestyrelsen godkender din prøveperiode hurtigst muligt, og så kan du tilmelde dig træninger.</p>}
      {sp.foraelder === "1" && <p>Din forælder eller værge har fået en mail med betalingslinket. Du har selv fået et login-link, så du kan se din side.</p>}
      {sp.foraelder === "0" && <p>Vi kunne ikke sende mailen til din forælder lige nu. Log ind med linket i din mail, og tryk &quot;Send linket igen&quot; under Bliv medlem.</p>}
      {sp.betalingsfejl && <p>Din profil er oprettet, men betalingen kunne ikke startes lige nu. Log ind med linket i din mail, og betal under Bliv medlem.</p>}
      {sp.findes && <p>Hvis mailen allerede har en profil hos os, har vi sendt et login-link. Log ind, så kan du melde dig ind eller forny derfra.</p>}
      <p className="muted">Kan du ikke finde mailen? Kig i spam, eller <Link href="/om/kontakt">skriv til os</Link>.</p>
      <div className="about-actions" style={{ justifyContent: "center" }}><Link href="/traening" className="button secondary">Se træningskalenderen</Link></div>
    </div>
  );
}
