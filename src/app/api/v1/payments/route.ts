import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { isoDate } from "@/lib/format";

/**
 * Læse-API til økonomisystem eller kasserer:
 *   GET /api/v1/payments?since=2026-01-01
 *   Authorization: Bearer <ACCOUNTING_API_TOKEN>
 * Returnerer betalte og refunderede kontingenter.
 */
function authorized(req: Request) {
  const token = process.env.ACCOUNTING_API_TOKEN;
  const header = req.headers.get("authorization") ?? "";
  if (!token || !header.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  const since = new URL(req.url).searchParams.get("since");
  const payments = await prisma.payment.findMany({
    where: { status: { in: ["PAID", "REFUNDED"] }, ...(since ? { paidAt: { gte: new Date(since) } } : {}) },
    include: { user: true, membership: { include: { type: true } } },
    orderBy: { paidAt: "asc" },
  });
  return Response.json({
    payments: payments.map((p) => ({
      id: p.id,
      date: p.paidAt ? isoDate(p.paidAt) : null,
      amount: p.amountOre / 100,
      currency: p.currency,
      status: p.status,
      description: p.description,
      membershipType: p.membership?.type.code ?? null,
      membershipStart: p.membership ? isoDate(p.membership.startDate) : null,
      membershipEnd: p.membership ? isoDate(p.membership.endDate) : null,
      member: { name: p.user.name, email: p.user.email },
      stripePaymentIntentId: p.stripePaymentIntentId,
      accounting: { status: p.accountingStatus, ref: p.accountingRef },
    })),
  });
}
