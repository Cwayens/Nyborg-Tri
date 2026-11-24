import Link from "next/link";

export const metadata = { title: "Siden findes ikke" };

export default function NotFound() {
  return (
    <div className="card empty notfound">
      <p className="about-kicker">404</p>
      <h1>Vi kan ikke finde siden</h1>
      <p className="muted">Den er måske flyttet, da vi skiftede til den nye hjemmeside. Prøv en af disse i stedet:</p>
      <div className="about-actions" style={{ justifyContent: "center" }}>
        <Link href="/" className="button">Til forsiden</Link>
        <Link href="/traening" className="button secondary">Træningskalender</Link>
        <Link href="/nyheder" className="button secondary">Nyheder</Link>
        <Link href="/om/kontakt" className="button secondary">Kontakt</Link>
      </div>
    </div>
  );
}
