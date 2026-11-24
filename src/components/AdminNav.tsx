import Link from "next/link";

export function AdminNav() {
  return (
    <p style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <Link href="/admin">Medlemmer</Link>
      <Link href="/admin/betalinger">Betalinger</Link>
      <Link href="/admin/adgang">Prøveperioder og koder</Link>
      <Link href="/admin/indhold">Indhold</Link>
      <Link href="/admin/sponsorer">Sponsorer</Link>
      <Link href="/admin/atleter">Atleter</Link>
      <Link href="/admin/kontakt">Kontakt</Link>
      <Link href="/admin/mail">Mail</Link>
      <Link href="/admin/funktioner">Funktioner</Link>
      <Link href="/admin/drift">Drift</Link>
      <a href="/admin/medlemmer.csv">Hent medlemsliste (CSV)</a>
    </p>
  );
}
