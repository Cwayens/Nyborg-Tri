import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { renderBody } from "@/lib/content";
import { dato, kr } from "@/lib/format";
import { currentMembership } from "@/lib/membership";
import { TRIAL_DAYS } from "@/lib/access";
import { joinAsGuest, requestTrial, resendPayLink, startCheckout, redeemCodeAction } from "./actions";
import { needsGuardian } from "@/lib/guardian";
import { demoEnabled } from "@/lib/demo";

export const metadata = { title: "Bliv medlem" };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ fejl?: string; annulleret?: string; besked?: string; sendt?: string; ikkesendt?: string; plan?: string }> }) {
  const { fejl, annulleret, besked, sendt, ikkesendt, plan } = await searchParams;
  const session = await auth();
  const [page, types] = await Promise.all([
    prisma.page.findUnique({ where: { path: "bliv-medlem" } }),
    prisma.membershipType.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const user = session?.user ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;
  const current = user ? await currentMembership(user.id) : null;
  const trial = user ? await prisma.trialRequest.findUnique({ where: { userId: user.id } }) : null;
  const payments = user ? await prisma.payment.findMany({ where: { userId: user.id, status: { in: ["PAID", "REFUNDED"] } }, orderBy: { paidAt: "desc" } }) : [];
  const awaiting = user
    ? await prisma.payment.findFirst({ where: { userId: user.id, payToken: { not: null }, status: { in: ["PENDING", "FAILED"] } }, orderBy: { createdAt: "desc" } })
    : null;
  const minor = needsGuardian(user?.birthDate ?? null);
  const usedCode = user ? await prisma.accessCode.findUnique({ where: { usedById: user.id } }) : null;

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

      <h2>{current ? "Forny medlemskab" : user ? "Meld dig ind og betal" : "Meld dig ind eller prøv gratis"}</h2>
      {fejl && <p className="status-warn">{fejl}</p>}
      {besked === "proeve" && <p className="notice">Tak! Din ansøgning om prøveperiode er sendt. Du får adgang, når bestyrelsen har godkendt den.</p>}
      {annulleret && <p className="muted">Betalingen blev annulleret. Du kan prøve igen herunder.</p>}
      {awaiting && (
        <div className={sendt ? "notice" : "card"} style={{ marginBottom: 16 }}>
          <p style={{ margin: 0 }}>
            {sendt ? "Betalingslinket er sendt" : "Vi venter på betaling"} til din forælder eller værge på <b>{awaiting.payLinkSentTo}</b>.
            Når kontingentet er betalt, kan du tilmelde dig træninger.
          </p>
          {ikkesendt && <p className="status-warn" style={{ margin: "8px 0 0" }}>Mailen kunne ikke sendes lige nu. Prøv igen om lidt, eller giv linket direkte til din forælder.</p>}
          {demoEnabled() && <p className="muted" style={{ margin: "8px 0 0" }}>Testversion: <Link href={`/betal/${awaiting.payToken}`}>åbn betalingslinket</Link> som forælderen får.</p>}
          <form action={resendPayLink} style={{ marginTop: 8 }}>
            <button className="linklike" type="submit">Send linket igen</button>
          </form>
        </div>
      )}
      {current && (
        <p>
          Du har medlemskab ({current.type.name}{current.source === "TRIAL" ? ", prøveperiode" : current.source === "CODE" ? ", via kode" : ""}) til og med {dato(current.endDate)}. Fornyer du nu, forlænges dit medlemskab med et år fra den dato.
        </p>
      )}

      {!user ? (
        <form action={joinAsGuest} id="meld-ind" className="card stack join-guest">
          <fieldset className="join-plan">
            <legend>Hvad vil du?</legend>
            <label className="join-option">
              <input type="radio" name="plan" value="trial" defaultChecked={plan !== "betal"} />
              <span><b>Prøv gratis i {TRIAL_DAYS} dage</b><small className="muted">Træn med, før du beslutter dig. Bestyrelsen godkender prøveperioden.</small></span>
            </label>
            <label className="join-option">
              <input type="radio" name="plan" value="pay" defaultChecked={plan === "betal"} />
              <span><b>Meld mig ind og betal</b><small className="muted">Betal med kort eller MobilePay. Medlemskabet gælder 1 år.</small></span>
            </label>
          </fieldset>
          <label className="join-paid">
            Medlemstype
            <select name="typeCode" defaultValue="ADULT">
              {types.map((t) => <option key={t.code} value={t.code}>{t.name} – {kr(t.priceOre)}</option>)}
            </select>
          </label>
          <div className="row2">
            <label>Fulde navn<input name="name" required autoComplete="name" /></label>
            <label>E-mail<input type="email" name="email" required autoComplete="email" /></label>
          </div>
          <div className="row2">
            <label>Telefon<input name="phone" required autoComplete="tel" inputMode="tel" /></label>
            <label>Fødselsdato<input type="date" name="birthDate" required /></label>
          </div>
          <label>Adresse<input name="address" required autoComplete="street-address" /></label>
          <div className="row2">
            <label>Postnr.<input name="zip" required inputMode="numeric" autoComplete="postal-code" /></label>
            <label>By<input name="city" required autoComplete="address-level2" defaultValue="Nyborg" /></label>
          </div>
          <fieldset className="guardian">
            <legend>Forælder eller værge</legend>
            <p className="muted" style={{ margin: 0 }}>Skal udfyldes, hvis du er under 18 år. Forælderen får betalingslink og kvitteringer.</p>
            <label>Navn<input name="guardianName" autoComplete="off" /></label>
            <label>E-mail<input type="email" name="guardianEmail" autoComplete="off" /></label>
          </fieldset>
          <label className="join-trial">Lidt om dig (valgfrit)<input name="message" placeholder="fx erfaring, og hvad du vil prøve" /></label>
          <label className="hp" aria-hidden="true">Lad feltet være tomt<input name="website" tabIndex={-1} autoComplete="off" /></label>
          <button className="button" type="submit" style={{ justifySelf: "start" }}>Fortsæt</button>
          <p className="muted small" style={{ margin: 0 }}>
            Vi sender dig et login-link på mail, så du kan komme ind på din side. Har du allerede en profil? <Link href="/login?callbackUrl=/bliv-medlem">Log ind</Link>.
            Se hvordan vi passer på dine data i vores <Link href="/privatlivspolitik">privatlivspolitik</Link>.
          </p>
        </form>
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
          <fieldset className="guardian" data-minor={minor || undefined}>
            <legend>Forælder eller værge</legend>
            <p className="muted" style={{ margin: 0 }}>Skal udfyldes, hvis du er under 18 år. Vi sender betalingslinket til din forælder eller værge, som også får kvitteringer og påmindelser om fornyelse.</p>
            <label>Navn<input name="guardianName" defaultValue={user.guardianName ?? ""} autoComplete="off" /></label>
            <label>E-mail<input type="email" name="guardianEmail" defaultValue={user.guardianEmail ?? ""} autoComplete="off" /></label>
          </fieldset>
          <button className="button" type="submit">{minor ? "Send betalingslink til forælder" : "Gå til betaling"}</button>
          <p className="muted">Du betaler sikkert med kort eller MobilePay via Stripe. Klubben ser aldrig dine kortoplysninger.</p>
        </form>
      )}
    
      {user && (
        <div className="grid" style={{ marginTop: 40 }}>
          <section id="proeve" className="card">
            <h2 style={{ marginTop: 0 }}>Prøv gratis i {TRIAL_DAYS} dage</h2>
            {!trial ? (
              <form action={requestTrial} className="stack">
                <p className="muted">Søg om en prøveperiode, så du kan tilmelde dig træninger, før du betaler. Bestyrelsen godkender ansøgningen.</p>
                <label>Fulde navn<input name="name" defaultValue={user.name ?? ""} required /></label>
                <label>Telefon<input name="phone" defaultValue={user.phone ?? ""} required /></label>
                <label>Lidt om dig (valgfrit)<input name="message" placeholder="fx erfaring, hvilke discipliner du vil prøve" /></label>
                <button className="button secondary" type="submit">Søg om prøveperiode</button>
              </form>
            ) : trial.status === "PENDING" ? (
              <p>Din ansøgning afventer godkendelse fra bestyrelsen.</p>
            ) : trial.status === "APPROVED" ? (
              <p className="status-ok">Din prøveperiode er godkendt.</p>
            ) : (
              <p>Din ansøgning blev ikke godkendt. Skriv til nyborgtri@gmail.com, hvis du har spørgsmål.</p>
            )}
          </section>
          <section id="kode" className="card">
            <h2 style={{ marginTop: 0 }}>Har du en kode?</h2>
            {usedCode ? (
              <p>Du har brugt koden {usedCode.code}.</p>
            ) : (
              <form action={redeemCodeAction} className="stack">
                <p className="muted">Har du fået en kode af klubben, kan du bruge den her. Hver kode kan kun bruges én gang.</p>
                <label>Kode<input name="code" placeholder="NT-XXXX-XXXX" required autoComplete="off" /></label>
                <button className="button secondary" type="submit">Brug kode</button>
              </form>
            )}
          </section>
        </div>
      )}
    
      {payments.length > 0 && (
        <>
          <h2>Kvitteringer</h2>
          <div className="table-scroll">
            <table className="list">
              <thead><tr><th>Dato</th><th>Beskrivelse</th><th>Beløb</th><th>Status</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}><td>{p.paidAt && dato(p.paidAt)}</td><td>{p.description}</td><td>{kr(p.amountOre)}</td><td>{p.status === "PAID" ? "Betalt" : "Refunderet"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
