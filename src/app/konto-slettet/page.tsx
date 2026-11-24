import Link from "next/link";

export const metadata = { title: "Profilen er slettet", robots: { index: false } };

export default function Deleted() {
  return (
    <div className="card empty notfound">
      <h1>Din profil er slettet</h1>
      <p className="muted">Dine oplysninger, træningsdata og beskeder er slettet, og du er logget ud. Du får en bekræftelse på mail.</p>
      <p className="muted">Betalinger gemmes i 5 år efter bogføringsloven, men uden dit navn og din mail.</p>
      <div className="about-actions" style={{ justifyContent: "center" }}><Link href="/" className="button">Til forsiden</Link></div>
    </div>
  );
}
