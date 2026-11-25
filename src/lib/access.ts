import { randomInt } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { latestMembershipEnd } from "./membership";

export const TRIAL_DAYS = 14;

/** Må brugeren tilmelde sig træninger? Kræver et aktivt, ikke-passivt medlemskab (betalt, prøveperiode eller kode). */
export async function canSignUp(userId: string): Promise<boolean> {
  const m = await prisma.membership.findFirst({
    where: { userId, startDate: { lte: new Date() }, endDate: { gt: new Date() }, type: { code: { not: "PASSIVE" } } },
    select: { id: true },
  });
  return !!m;
}

/**
 * Er medlemskabet udløbet? Brugeren har haft et medlemskab, der giver adgang til træning,
 * men har intet aktivt nu. Man kan stadig logge ind og se sine data, men ikke tilmelde sig.
 */
export async function membershipExpired(userId: string): Promise<{ endDate: Date } | null> {
  if (await canSignUp(userId)) return null;
  const last = await prisma.membership.findFirst({
    where: { userId, endDate: { lte: new Date() }, type: { code: { not: "PASSIVE" } } },
    orderBy: { endDate: "desc" },
    select: { endDate: true },
  });
  return last;
}

/** Dage før udløb, hvor medlemmet bliver mindet om at forny (gul bjælke øverst). */
export const RENEW_WARNING_DAYS = 30;

/**
 * Udløber adgangen snart? Det seneste aktive medlemskab slutter inden for 30 dage, og der er ikke allerede betalt for en ny periode.
 * Passive medlemskaber tæller ikke (de giver ikke adgang til træning).
 */
export async function membershipEndingSoon(userId: string): Promise<{ endDate: Date; trial: boolean } | null> {
  const now = new Date();
  const m = await prisma.membership.findFirst({
    where: { userId, startDate: { lte: now }, endDate: { gt: now }, type: { code: { not: "PASSIVE" } } },
    orderBy: { endDate: "desc" },
    select: { endDate: true, source: true },
  });
  if (!m || m.endDate.getTime() - now.getTime() > RENEW_WARNING_DAYS * 864e5) return null;
  // Allerede fornyet: et medlemskab, der starter, når det nuværende slutter
  const next = await prisma.membership.findFirst({ where: { userId, endDate: { gt: m.endDate }, type: { code: { not: "PASSIVE" } } }, select: { id: true } });
  return next ? null : { endDate: m.endDate, trial: m.source === "TRIAL" };
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 3600 * 1000);
}

/** Medlemskab uden betaling. Starter i dag, eller i forlængelse af et eksisterende medlemskab. */
export async function grantMembership(
  tx: Prisma.TransactionClient,
  args: { userId: string; typeId: string; days: number; source: "TRIAL" | "CODE" | "MANUAL" },
) {
  const now = new Date();
  const end = await latestMembershipEnd(args.userId, tx);
  const startDate = end && end > now ? end : now;
  return tx.membership.create({
    data: { userId: args.userId, typeId: args.typeId, source: args.source, startDate, endDate: addDays(startDate, args.days) },
  });
}

// Uden O/0 og I/1, så koden er let at læse op og taste
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(): string {
  const part = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `NT-${part()}-${part()}`;
}

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export type RedeemResult = { ok: true; endDate: Date } | { ok: false; error: string };

/** Indløs en engangskode. Atomisk: koden kan kun bruges én gang, også ved samtidige forsøg. */
export async function redeemCode(userId: string, input: string): Promise<RedeemResult> {
  const code = normalizeCode(input);
  return prisma.$transaction(async (tx) => {
    const found = await tx.accessCode.findUnique({ where: { code } });
    if (!found) return { ok: false, error: "Koden findes ikke" };
    if (found.usedById) return { ok: false, error: "Koden er allerede brugt" };
    if (await tx.accessCode.findUnique({ where: { usedById: userId } })) {
      return { ok: false, error: "Du har allerede brugt en kode" };
    }
    const claimed = await tx.accessCode.updateMany({
      where: { id: found.id, usedById: null },
      data: { usedById: userId, usedAt: new Date() },
    });
    if (claimed.count !== 1) return { ok: false, error: "Koden er allerede brugt" };
    const m = await grantMembership(tx, { userId, typeId: found.typeId, days: found.days, source: "CODE" });
    // Giv en atletgruppe ud fra medlemstypen, hvis brugeren ikke har en, så man kan tilmelde sig med det samme
    const [user, type] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { id: userId } }),
      tx.membershipType.findUniqueOrThrow({ where: { id: found.typeId } }),
    ]);
    if (!user.athleteGroup && type.code !== "PASSIVE") {
      await tx.user.update({ where: { id: userId }, data: { athleteGroup: type.code === "YOUTH" ? "BOERN" : "BREDDE" } });
    }
    return { ok: true, endDate: m.endDate };
  });
}
