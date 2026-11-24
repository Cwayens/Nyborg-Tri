import { prisma } from "./db";
import { nextPeriod, latestMembershipEnd } from "./membership";
import { syncPayment } from "./accounting";
import { defaultGroupFor } from "./roles";

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
    // Nye medlemmer får en atletgruppe ud fra medlemstypen, hvis admin ikke har sat en
    const [user, type] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { id: payment.userId } }),
      tx.membershipType.findUniqueOrThrow({ where: { id: args.typeId } }),
    ]);
    if (!user.athleteGroup && type.code !== "PASSIVE") {
      await tx.user.update({ where: { id: user.id }, data: { athleteGroup: defaultGroupFor(type.code) } });
    }
    return true;
  });

  if (created) await syncPayment(args.paymentId);
}
