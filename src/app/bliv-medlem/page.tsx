import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { renderBody } from "@/lib/content";
import { dato, kr } from "@/lib/format";
import { currentMembership } from "@/lib/membership";
import { startCheckout } from "./actions";

export const metadata = { title: "Bliv medlem" };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ fejl?: string; annulleret?: string }> }) {
  const { fejl, annulleret } = await searchParams;
  const session = await auth();
  const [page, types] = await Promise.all([
    prisma.page.findUnique({ where: { path: "bliv-medlem" } }),
    prisma.membershipType.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const user = session?.user ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;
  const current = user ? await currentMembership(user.id) : null;

  return (
    <>
      <h1>Bliv medlem</h1>
      {page && <div className="content" dangerouslySetInnerHTML={{ __html: renderBody(page.body, page.format) }} />}

      <h2>Kontingent</h2>
      <div className="grid">
        {types.map((t) => (
          <div key={t.id} className="card">
            <h3 style={{ marginTop: 0 }}>{t.name}</h3>
            <p style={{ fontSize: "1.6rem", fontWeight: 700, margin: 0 }}>{kr(t.priceOre)}</p>
            <p className="muted">pr. år · {t.description}</p>
          </div>
        ))}
      </div>

      <h2>{current ? "Forny medlemskab" : "Meld dig ind og betal"}</h2>
      {fejl && <p className="status-warn">{fejl}</p>}
      {annulleret && <p className="muted">Betalingen blev annulleret. Du kan prøve igen herunder.</p>}
      {current && (
        <p>
          Du er medlem ({current.type.name}) til og med {dato(current.endDate)}. Fornyer du nu, forlænges dit medlemskab med et år fra den dato.
        </p>
      )}

      {!user ? (
        <p>
          <Link className="button" href="/login?callbackUrl=/bliv-medlem">Log ind for at melde dig ind</Link>
        </p>
      ) : (
        <form action={startCheckout} className="stack">
          <label>
            Medlemstype
            <select name="typeCode" defaultValue={current?.type.code ?? "ADULT"}>
              {types.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name} – {kr(t.priceOre)}
                </option>
              ))}
            </select>
          </label>
          <label>Fulde navn<input name="name" defaultValue={user.name ?? ""} required autoComplete="name" /></label>
          <label>Telefon<input name="phone" defaultValue={user.phone ?? ""} required autoComplete="tel" /></label>
          <label>
            Fødselsdato
            <input type="date" name="birthDate" defaultValue={user.birthDate?.toISOString().slice(0, 10) ?? ""} required />
          </label>
          <label>Adresse<input name="address" defaultValue={user.address ?? ""} required autoComplete="street-address" /></label>
          <label>Postnr.<input name="zip" defaultValue={user.zip ?? ""} required inputMode="numeric" autoComplete="postal-code" /></label>
          <label>By<input name="city" defaultValue={user.city ?? ""} required autoComplete="address-level2" /></label>
          <button className="button" type="submit">Gå til betaling</button>
          <p className="muted">Du betaler sikkert med kort eller MobilePay via Stripe. Klubben ser aldrig dine kortoplysninger.</p>
        </form>
      )}
    </>
  );
}
