import Link from "next/link";

export function AdminNav() {
  return (
    <p style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <Link href="/admin">Medlemmer</Link>
      <Link href="/admin/betalinger">Betalinger</Link>
      <Link href="/admin/indhold">Indhold</Link>
      <a href="/admin/medlemmer.csv">Hent medlemsliste (CSV)</a>
    </p>
  );
}
