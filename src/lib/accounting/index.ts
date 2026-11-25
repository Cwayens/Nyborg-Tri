import { prisma } from "@/lib/db";
import { isoDate } from "@/lib/format";
import { economicProvider } from "./economic";
import { clubEnv } from "@/lib/club-secrets";
import type { AccountingPayment, AccountingProvider } from "./types";

export type { AccountingPayment, AccountingProvider };

/**
 * Vælg økonomisystem via klubbens ACCOUNTING_PROVIDER.
 * "none": intet push – kassereren henter i stedet data via CSV eller /api/v1/payments.
 * Nye systemer (Dinero, Billy, Uniconta …) tilføjes som en ny provider-fil.
 */
export async function getProvider(): Promise<AccountingProvider | null> {
  const name = (await clubEnv("ACCOUNTING_PROVIDER")) ?? "none";
  switch (name) {
    case "economic":
      return economicProvider();
    case "none":
      return null;
    default:
      throw new Error(`Ukendt ACCOUNTING_PROVIDER: ${name}`);
  }
}

export async function toAccountingPayment(paymentId: string): Promise<AccountingPayment> {
  const p = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: { user: true, membership: { include: { type: true } } },
  });
  const name = p.user.name ?? p.user.email;
  return {
    paymentId: p.id,
    date: isoDate(p.paidAt ?? p.createdAt),
    amountOre: p.amountOre,
    currency: p.currency,
    text: `${p.description} – ${name}`,
    memberName: name,
    memberEmail: p.user.email,
    membershipCode: p.membership?.type.code ?? null,
    stripePaymentIntentId: p.stripePaymentIntentId,
  };
}

/** Sender en betaling til økonomisystemet og gemmer resultatet. Fejl stopper aldrig selve betalingen. */
export async function syncPayment(paymentId: string): Promise<void> {
  let provider: AccountingProvider | null;
  try {
    provider = await getProvider();
  } catch (e) {
    await prisma.payment.update({ where: { id: paymentId }, data: { accountingStatus: "FAILED", accountingError: String(e) } });
    return;
  }
  if (!provider) {
    await prisma.payment.update({ where: { id: paymentId }, data: { accountingStatus: "SKIPPED" } });
    return;
  }
  try {
    const { ref } = await provider.pushPayment(await toAccountingPayment(paymentId));
    await prisma.payment.update({
      where: { id: paymentId },
      data: { accountingStatus: "SENT", accountingRef: ref, accountingError: null, accountingSentAt: new Date() },
    });
  } catch (e) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: { accountingStatus: "FAILED", accountingError: e instanceof Error ? e.message : String(e) },
    });
  }
}
