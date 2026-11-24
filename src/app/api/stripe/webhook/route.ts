import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { completePayment } from "@/lib/payments";

// Stripe kalder denne adresse, når en betaling er gennemført.
// Opsætning: Stripe Dashboard → Developers → Webhooks → https://<domæne>/api/stripe/webhook
// Events: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.expired, charge.refunded

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return new Response("Mangler signatur", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return new Response("Ugyldig signatur", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object;
      if (s.payment_status !== "paid") break; // fx bankoverførsel der endnu ikke er gennemført
      const { paymentId, typeId } = s.metadata ?? {};
      if (!paymentId || !typeId) break;
      const pi = typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent?.id ?? null);
      await completePayment({ paymentId, typeId, paymentIntentId: pi });
      break;
    }
    case "checkout.session.expired": {
      const paymentId = event.data.object.metadata?.paymentId;
      if (paymentId) await prisma.payment.updateMany({ where: { id: paymentId, status: "PENDING" }, data: { status: "FAILED" } });
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (pi && charge.refunded) {
        const payment = await prisma.payment.findUnique({ where: { stripePaymentIntentId: pi } });
        if (payment) {
          await prisma.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
          // Medlemskabet afsluttes ved fuld refundering
          if (payment.membershipId) await prisma.membership.update({ where: { id: payment.membershipId }, data: { endDate: new Date() } });
        }
      }
      break;
    }
  }
  return Response.json({ received: true });
}
