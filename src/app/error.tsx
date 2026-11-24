"use client";

import Link from "next/link";

// Vises i stedet for en hvid side, hvis noget går galt på serveren.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card empty notfound">
      <h1>Noget gik galt</h1>
      <p className="muted">Siden kunne ikke vises lige nu. Prøv igen om et øjeblik. Hvis det bliver ved, så skriv til os.</p>
      <div className="about-actions" style={{ justifyContent: "center" }}>
        <button className="button" type="button" onClick={() => reset()}>Prøv igen</button>
        <Link href="/" className="button secondary">Til forsiden</Link>
        <Link href="/om/kontakt" className="button secondary">Kontakt</Link>
      </div>
    </div>
  );
}
