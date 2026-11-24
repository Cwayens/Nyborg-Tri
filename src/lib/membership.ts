import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export function addOneYear(d: Date): Date {
  const r = new Date(d);
  r.setUTCFullYear(r.getUTCFullYear() + 1);
  return r;
}

/** Nyt medlemskab starter i dag, eller når det nuværende udløber (ved fornyelse før tid). */
export function nextPeriod(now: Date, currentEnd: Date | null): { startDate: Date; endDate: Date } {
  const startDate = currentEnd && currentEnd > now ? currentEnd : now;
  return { startDate, endDate: addOneYear(startDate) };
}

export async function currentMembership(userId: string) {
  return prisma.membership.findFirst({
    where: { userId, endDate: { gt: new Date() } },
    orderBy: { endDate: "desc" },
    include: { type: true },
  });
}

export async function latestMembershipEnd(userId: string, db: Prisma.TransactionClient = prisma): Promise<Date | null> {
  const m = await db.membership.findFirst({ where: { userId }, orderBy: { endDate: "desc" } });
  return m?.endDate ?? null;
}
