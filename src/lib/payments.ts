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
    const now = new Date();
    // Gør betalingen til "betalt" som det første og kun, hvis den ikke allerede er det. Kommer den samme
    // webhook to gange samtidig, venter den ene på den anden og opretter derfor ikke et ekstra medlemskab.
    const claimed = await tx.payment.updateMany({ where: { id: args.paymentId, status: { not: "PAID" } }, data: { status: "PAID", paidAt: now } });
    if (claimed.count !== 1) return false;
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: args.paymentId } });

    const period = nextPeriod(now, await latestMembershipEnd(payment.userId, tx));
    const membership = await tx.membership.create({
      data: { userId: payment.userId, typeId: args.typeId, ...period },
    });
    await tx.payment.update({
      where: { id: payment.id },
      data: { membershipId: membership.id, stripePaymentIntentId: args.paymentIntentId },
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
