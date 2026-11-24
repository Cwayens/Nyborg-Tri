import { prisma } from "./db";
import { nextPeriod, latestMembershipEnd } from "./membership";
import { syncPayment } from "./accounting";

/**
 * Registrerer en gennemført betaling: markerer den som betalt og opretter medlemskabet.
 * Idempotent – Stripe kan sende samme webhook flere gange.
 */
export async function completePayment(args: { paymentId: string; typeId: string; paymentIntentId: string | null }) {
  const created = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: args.paymentId } });
    if (payment.status === "PAID") return false;

    const now = new Date();
    const period = nextPeriod(now, await latestMembershipEnd(payment.userId));
    const membership = await tx.membership.create({
      data: { userId: payment.userId, typeId: args.typeId, ...period },
    });
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "PAID", paidAt: now, membershipId: membership.id, stripePaymentIntentId: args.paymentIntentId },
    });
    return true;
  });

  if (created) await syncPayment(args.paymentId);
}
