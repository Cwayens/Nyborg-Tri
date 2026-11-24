import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { baseUrl } from "@/lib/url";
import { kr } from "@/lib/format";

// Betalingslink til forælder/værge. Kræver ikke login: linket er hemmeligt og sendes kun til værgens e-mail.
export const metadata = { title: "Betal kontingent", robots: { index: false } };

async function findPayment(token: string) {
  if (!/^[\w-]{20,64}$/.test(token)) return null;
  return prisma.payment.findUnique({ where: { payToken: token }, include: { user: { select: { name: true, guardianEmail: true } } } });
}

async function pay(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  const p = await findPayment(token);
  if (!p || p.status === "PAID" || p.status === "REFUNDED" || !p.typeId) notFound();
  const base = await baseUrl();
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: p.payLinkSentTo ?? p.user.guardianEmail ?? undefined,
    locale: "da",
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "dkk",
        unit_amount: p.amountOre,
        product_data: { name: `Medlemskab Nyborg Triathlon Klub – ${p.user.name ?? "medlem"}`, description: `${p.description}, gælder 1 år` },
      },
    }],
    metadata: { paymentId: p.id, userId: p.userId, typeId: p.typeId },
    payment_intent_data: { metadata: { paymentId: p.id } },
    success_url: `${base}/betal/${token}?ok=1`,
    cancel_url: `${base}/betal/${token}`,
  });
  // Et nyt forsøg: det gamle Stripe-link må ikke længere markere betalingen som mislykket
  await prisma.payment.update({ where: { id: p.id }, data: { stripeCheckoutSessionId: session.id, status: "PENDING" } });
  redirect(session.url!);
}

export default async function PayPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { token } = await params;
  const { ok } = await searchParams;
  const p = await findPayment(token);
  if (!p) notFound();
  const name = p.user.name ?? "medlemmet";
  return (
    <div className="card stack" style={{ maxWidth: 520, margin: "24px auto" }}>
      <h1 style={{ marginTop: 0 }}>Kontingent for {name}</h1>
      {p.status === "PAID" || ok ? (
        <p className="status-ok">
          {p.status === "PAID" ? "Kontingentet er betalt. Tak!" : "Tak! Betalingen bliver registreret om et øjeblik."} {name} kan nu tilmelde sig træninger.
          Kvitteringen er sendt til din e-mail.
        </p>
      ) : p.status === "REFUNDED" ? (
        <p>Betalingen er refunderet. Skriv til nyborgtri@gmail.com, hvis du har spørgsmål.</p>
      ) : (
        <>
          <p>{name} har meldt sig ind i Nyborg Triathlon Klub og har skrevet dig som forælder eller værge.</p>
          <p className="amount" style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>{kr(p.amountOre)}</p>
          <p className="muted" style={{ marginTop: 0 }}>{p.description}. Medlemskabet gælder 1 år.</p>
          <form action={pay}>
            <input type="hidden" name="token" value={token} />
            <button className="button big" type="submit">Betal med kort eller MobilePay</button>
          </form>
          <p className="muted">Du betaler sikkert via Stripe. Klubben ser aldrig dine kortoplysninger. Kvittering og påmindelser om fornyelse sendes til dig.</p>
        </>
      )}
    </div>
  );
}
