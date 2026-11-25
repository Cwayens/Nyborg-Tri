import { featuresOff } from "@/lib/features";
import Link from "next/link";
import { staffOf } from "@/lib/staff";

export async function AdminNav() {
  const off = await featuresOff();
  const { auth } = await import("@/auth");
  const me = await staffOf((await auth())?.user?.id);
  // Kassereren ser kun sin del af administrationen
  if (me && me.role !== "ADMIN") return (
    <p style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <Link href="/admin/oekonomi">Økonomi</Link>
      <Link href="/admin/betalinger">Betalinger</Link>
      <Link href="/admin/medlemstyper">Medlemstyper</Link>
      <a href="/admin/medlemmer.csv">Hent medlemsliste (CSV)</a>
    </p>
  );
  return (
    <p style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <Link href="/admin/kom-i-gang">Kom i gang</Link>
      <Link href="/admin">Medlemmer</Link>
      <Link href="/admin/import">Importér</Link>
      <Link href="/admin/hold">Hold</Link>
      <Link href="/admin/medlemstyper">Medlemstyper</Link>
      <Link href="/admin/oekonomi">Økonomi</Link>
      <Link href="/admin/betalinger">Betalinger</Link>
      <Link href="/admin/adgang">Prøveperioder og koder</Link>
      <Link href="/admin/klubben">Klubben</Link>
      <Link href="/admin/indhold">Nyheder og sider</Link>
      {!off.has("sponsorer") && <Link href="/admin/sponsorer">Sponsorer</Link>}
      {!off.has("atleter") && <Link href="/admin/atleter">Atleter</Link>}
      <Link href="/admin/kontakt">Kontakt</Link>
      {!off.has("mail") && <Link href="/admin/mail">Mail</Link>}
      <Link href="/admin/funktioner">Funktioner</Link>
      <Link href="/admin/drift">Drift</Link>
      <a href="/admin/medlemmer.csv">Hent medlemsliste (CSV)</a>
    </p>
  );
}
