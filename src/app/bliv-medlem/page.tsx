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
import { CLUB } from "@/lib/club";
import { getLocale, translator } from "@/lib/i18n";
import { isOn } from "@/lib/features";

export async function generateMetadata() {
  const t = translator(await getLocale());
  return { title: t("Bliv medlem", "Join the club") };
}

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
  const loc = await getLocale();
  const t = translator(loc);
  const mentorOn = await isOn("mentor");

  return (
    <>
      <h1>{t("Bliv medlem", "Join the club")}</h1>
      {/* Klubbens egen tekst er på dansk. Engelske besøgende får en kort standardtekst. */}
      {loc === "en" ? (
        <p className="lead">There is room for everyone at {CLUB.name}, young and old, beginners and experienced triathletes. You are welcome to try a few trainings before you join.</p>
      ) : page && <div className="content" dangerouslySetInnerHTML={{ __html: renderBody(page.body, page.format) }} />}

      <h2>{t("Kontingent", "Membership fees")}</h2>
      <div className="grid">
        {types.map((m) => (
          <div key={m.id} className="card">
            <h3 style={{ marginTop: 0 }}>{m.name}</h3>
            <p style={{ fontSize: "1.6rem", fontWeight: 700, margin: 0 }}>{kr(m.priceOre, loc)}</p>
            <p className="muted">{t("pr. år", "per year")} · {m.description}</p>
          </div>
        ))}
      </div>

      <h2>{current ? t("Forny medlemskab", "Renew membership") : user ? t("Meld dig ind og betal", "Join and pay") : t("Meld dig ind eller prøv gratis", "Join or try for free")}</h2>
      {fejl && <p className="status-warn">{fejl}</p>}
      {besked === "proeve" && <p className="notice">{t("Tak! Din ansøgning om prøveperiode er sendt. Du får adgang, når bestyrelsen har godkendt den.", "Thanks! Your trial request has been sent. You get access once the board has approved it.")}</p>}
      {annulleret && <p className="muted">{t("Betalingen blev annulleret. Du kan prøve igen herunder.", "The payment was cancelled. You can try again below.")}</p>}
      {awaiting && (
        <div className={sendt ? "notice" : "card"} style={{ marginBottom: 16 }}>
          <p style={{ margin: 0 }}>
            {sendt ? t("Betalingslinket er sendt", "The payment link has been sent") : t("Vi venter på betaling", "We are waiting for payment")} {t("til din forælder eller værge på", "to your parent or guardian at")} <b>{awaiting.payLinkSentTo}</b>.
            {" "}{t("Når kontingentet er betalt, kan du tilmelde dig træninger.", "Once the fee is paid, you can sign up for trainings.")}
          </p>
          {ikkesendt && <p className="status-warn" style={{ margin: "8px 0 0" }}>{t("Mailen kunne ikke sendes lige nu. Prøv igen om lidt, eller giv linket direkte til din forælder.", "The email could not be sent right now. Try again shortly, or give the link to your parent directly.")}</p>}
          {demoEnabled() && <p className="muted" style={{ margin: "8px 0 0" }}>{t("Testversion:", "Test version:")} <Link href={`/betal/${awaiting.payToken}`}>{t("åbn betalingslinket", "open the payment link")}</Link> {t("som forælderen får.", "the parent receives.")}</p>}
          <form action={resendPayLink} style={{ marginTop: 8 }}>
            <button className="linklike" type="submit">{t("Send linket igen", "Send the link again")}</button>
          </form>
        </div>
      )}
      {current && (
        <p>
          {t("Du har medlemskab", "You are a member")} ({current.type.name}{current.source === "TRIAL" ? t(", prøveperiode", ", trial") : current.source === "CODE" ? t(", via kode", ", via code") : ""}) {t("til og med", "until")} {dato(current.endDate, loc)}. {t("Fornyer du nu, forlænges dit medlemskab med et år fra den dato.", "If you renew now, your membership is extended by one year from that date.")}
        </p>
      )}

      {!user ? (
        <form action={joinAsGuest} id="meld-ind" className="card stack join-guest">
          <fieldset className="join-plan">
            <legend>{t("Hvad vil du?", "What would you like?")}</legend>
            <label className="join-option">
              <input type="radio" name="plan" value="trial" defaultChecked={plan !== "betal"} />
              <span><b>{t(`Prøv gratis i ${TRIAL_DAYS} dage`, `Try for free for ${TRIAL_DAYS} days`)}</b><small className="muted">{t("Træn med, før du beslutter dig. Bestyrelsen godkender prøveperioden.", "Train with us before you decide. The board approves the trial.")}</small></span>
            </label>
            <label className="join-option">
              <input type="radio" name="plan" value="pay" defaultChecked={plan === "betal"} />
              <span><b>{t("Meld mig ind og betal", "Join and pay")}</b><small className="muted">{t("Betal med kort eller MobilePay. Medlemskabet gælder 1 år.", "Pay by card or MobilePay. Membership lasts 1 year.")}</small></span>
            </label>
          </fieldset>
          <label className="join-paid">
            Medlemstype
            <select name="typeCode" defaultValue="ADULT">
              {types.map((m) => <option key={m.code} value={m.code}>{m.name} – {kr(m.priceOre, loc)}</option>)}
            </select>
          </label>
          <div className="row2">
            <label>{t("Fulde navn", "Full name")}<input name="name" required autoComplete="name" /></label>
            <label>{t("E-mail", "Email")}<input type="email" name="email" required autoComplete="email" /></label>
          </div>
          <div className="row2">
            <label>{t("Telefon", "Phone")}<input name="phone" required autoComplete="tel" inputMode="tel" /></label>
            <label>{t("Fødselsdato", "Date of birth")}<input type="date" name="birthDate" required /></label>
          </div>
          <label>{t("Adresse", "Address")}<input name="address" required autoComplete="street-address" /></label>
          <div className="row2">
            <label>{t("Postnr.", "Postcode")}<input name="zip" required inputMode="numeric" autoComplete="postal-code" /></label>
            <label>{t("By", "Town")}<input name="city" required autoComplete="address-level2" defaultValue={CLUB.city} /></label>
          </div>
          <fieldset className="guardian">
            <legend>{t("Forælder eller værge", "Parent or guardian")}</legend>
            <p className="muted" style={{ margin: 0 }}>{t("Skal udfyldes, hvis du er under 18 år. Forælderen får betalingslink og kvitteringer.", "Required if you are under 18. The parent receives the payment link and receipts.")}</p>
            <label>Navn<input name="guardianName" autoComplete="off" /></label>
            <label>E-mail<input type="email" name="guardianEmail" autoComplete="off" /></label>
          </fieldset>
          {mentorOn && (
            <label className="check join-mentor">
              <input type="checkbox" name="wantsMentor" />
              <span>{t("Jeg vil gerne have en mentor", "I'd like a mentor")}<small className="muted">{t("En erfaren klubkammerat kontakter dig og viser dig rundt de første gange. Kun for voksne (18+). Mentoren får dit navn, din mail og dit telefonnummer.", "An experienced clubmate gets in touch and shows you around the first few times. Adults only (18+). Your mentor gets your name, email and phone number.")}</small></span>
            </label>
          )}
          <label className="join-trial">{t("Lidt om dig (valgfrit)", "A bit about you (optional)")}<input name="message" placeholder={t("fx erfaring, og hvad du vil prøve", "e.g. experience, and what you want to try")} /></label>
          <label className="hp" aria-hidden="true">Lad feltet være tomt<input name="website" tabIndex={-1} autoComplete="off" /></label>
          <button className="button" type="submit" style={{ justifySelf: "start" }}>{t("Fortsæt", "Continue")}</button>
          <p className="muted small" style={{ margin: 0 }}>
            {t("Vi sender dig et login-link på mail, så du kan komme ind på din side. Har du allerede en profil?", "We email you a login link so you can get to your page. Already have a profile?")} <Link href="/login?callbackUrl=/bliv-medlem">{t("Log ind", "Log in")}</Link>.
            {" "}{t("Se hvordan vi passer på dine data i vores", "See how we look after your data in our")} <Link href="/privatlivspolitik">{t("privatlivspolitik", "privacy policy")}</Link>.
          </p>
        </form>
      ) : (
        <form action={startCheckout} className="stack">
          <label>
            Medlemstype
            <select name="typeCode" defaultValue={current?.type.code ?? "ADULT"}>
              {types.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.name} – {kr(m.priceOre, loc)}
                </option>
              ))}
            </select>
          </label>
          <label>{t("Fulde navn", "Full name")}<input name="name" defaultValue={user.name ?? ""} required autoComplete="name" /></label>
          <label>{t("Telefon", "Phone")}<input name="phone" defaultValue={user.phone ?? ""} required autoComplete="tel" /></label>
          <label>
            {t("Fødselsdato", "Date of birth")}
            <input type="date" name="birthDate" defaultValue={user.birthDate?.toISOString().slice(0, 10) ?? ""} required />
          </label>
          <label>{t("Adresse", "Address")}<input name="address" defaultValue={user.address ?? ""} required autoComplete="street-address" /></label>
          <label>{t("Postnr.", "Postcode")}<input name="zip" defaultValue={user.zip ?? ""} required inputMode="numeric" autoComplete="postal-code" /></label>
          <label>{t("By", "Town")}<input name="city" defaultValue={user.city ?? ""} required autoComplete="address-level2" /></label>
          <fieldset className="guardian" data-minor={minor || undefined}>
            <legend>{t("Forælder eller værge", "Parent or guardian")}</legend>
            <p className="muted" style={{ margin: 0 }}>{t("Skal udfyldes, hvis du er under 18 år. Vi sender betalingslinket til din forælder eller værge, som også får kvitteringer og påmindelser om fornyelse.", "Required if you are under 18. We send the payment link to your parent or guardian, who also gets receipts and renewal reminders.")}</p>
            <label>Navn<input name="guardianName" defaultValue={user.guardianName ?? ""} autoComplete="off" /></label>
            <label>E-mail<input type="email" name="guardianEmail" defaultValue={user.guardianEmail ?? ""} autoComplete="off" /></label>
          </fieldset>
          <button className="button" type="submit">{minor ? t("Send betalingslink til forælder", "Send payment link to parent") : t("Gå til betaling", "Go to payment")}</button>
          <p className="muted">{t("Du betaler sikkert med kort eller MobilePay via Stripe. Klubben ser aldrig dine kortoplysninger.", "You pay securely by card or MobilePay via Stripe. The club never sees your card details.")}</p>
        </form>
      )}
    
      {user && (
        <div className="grid" style={{ marginTop: 40 }}>
          <section id="proeve" className="card">
            <h2 style={{ marginTop: 0 }}>{t(`Prøv gratis i ${TRIAL_DAYS} dage`, `Try for free for ${TRIAL_DAYS} days`)}</h2>
            {!trial ? (
              <form action={requestTrial} className="stack">
                <p className="muted">{t("Søg om en prøveperiode, så du kan tilmelde dig træninger, før du betaler. Bestyrelsen godkender ansøgningen.", "Request a trial so you can sign up for trainings before you pay. The board approves the request.")}</p>
                <label>{t("Fulde navn", "Full name")}<input name="name" defaultValue={user.name ?? ""} required /></label>
                <label>{t("Telefon", "Phone")}<input name="phone" defaultValue={user.phone ?? ""} required /></label>
                <label>{t("Lidt om dig (valgfrit)", "A bit about you (optional)")}<input name="message" placeholder={t("fx erfaring, hvilke discipliner du vil prøve", "e.g. experience, which disciplines you want to try")} /></label>
                <button className="button secondary" type="submit">{t("Søg om prøveperiode", "Request a trial")}</button>
              </form>
            ) : trial.status === "PENDING" ? (
              <p>{t("Din ansøgning afventer godkendelse fra bestyrelsen.", "Your request is awaiting approval from the board.")}</p>
            ) : trial.status === "APPROVED" ? (
              <p className="status-ok">{t("Din prøveperiode er godkendt.", "Your trial has been approved.")}</p>
            ) : (
              <p>{t("Din ansøgning blev ikke godkendt. Skriv til", "Your request was not approved. Write to")} {CLUB.email}{t(", hvis du har spørgsmål.", " if you have questions.")}</p>
            )}
          </section>
          <section id="kode" className="card">
            <h2 style={{ marginTop: 0 }}>{t("Har du en kode?", "Do you have a code?")}</h2>
            {usedCode ? (
              <p>{t("Du har brugt koden", "You have used the code")} {usedCode.code}.</p>
            ) : (
              <form action={redeemCodeAction} className="stack">
                <p className="muted">{t("Har du fået en kode af klubben, kan du bruge den her. Hver kode kan kun bruges én gang.", "If the club gave you a code, you can use it here. Each code can only be used once.")}</p>
                <label>{t("Kode", "Code")}<input name="code" placeholder="NT-XXXX-XXXX" required autoComplete="off" /></label>
                <button className="button secondary" type="submit">{t("Brug kode", "Use code")}</button>
              </form>
            )}
          </section>
        </div>
      )}
    
      {payments.length > 0 && (
        <>
          <h2>{t("Kvitteringer", "Receipts")}</h2>
          <div className="table-scroll">
            <table className="list">
              <thead><tr><th>{t("Dato", "Date")}</th><th>{t("Beskrivelse", "Description")}</th><th>{t("Beløb", "Amount")}</th><th>Status</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}><td>{p.paidAt && dato(p.paidAt, loc)}</td><td>{p.description}</td><td>{kr(p.amountOre, loc)}</td><td>{p.status === "PAID" ? t("Betalt", "Paid") : t("Refunderet", "Refunded")}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
