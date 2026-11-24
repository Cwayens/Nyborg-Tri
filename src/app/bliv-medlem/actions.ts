"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { redeemCode } from "@/lib/access";
import { baseUrl } from "@/lib/url";
import { ageOn, isEmail, needsGuardian } from "@/lib/guardian";
import { sendPayLink } from "@/lib/paylink";

const schema = z.object({
  typeCode: z.string().min(1),
  name: z.string().trim().min(2, "Skriv dit fulde navn"),
  phone: z.string().trim().min(8, "Skriv dit telefonnummer"),
  birthDate: z.coerce.date({ message: "Skriv din fødselsdato" }),
  address: z.string().trim().min(2, "Skriv din adresse"),
  zip: z.string().trim().regex(/^\d{4}$/, "Postnummer skal være 4 cifre"),
  city: z.string().trim().min(2, "Skriv din by"),
  guardianName: z.string().trim().max(100).optional(),
  guardianEmail: z.string().trim().toLowerCase().max(200).optional(),
});

const fail = (m: string) => redirect(`/bliv-medlem?fejl=${encodeURIComponent(m)}`);

export async function startCheckout(formData: FormData) {
  const user = await requireUser("/bliv-medlem");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/bliv-medlem?fejl=${encodeURIComponent(parsed.error.issues[0].message)}`);
  const { typeCode, guardianName, guardianEmail, ...profile } = parsed.data;
  const minor = needsGuardian(profile.birthDate);
  if (minor) {
    if (!guardianName || guardianName.length < 2) fail("Skriv navnet på en forælder eller værge");
    if (!guardianEmail || !isEmail(guardianEmail)) fail("Skriv e-mail til en forælder eller værge");
    if (guardianEmail === user.email?.toLowerCase()) fail("Forælderens e-mail skal være en anden end barnets");
  }

  const type = await prisma.membershipType.findFirst({ where: { code: typeCode, active: true } });
  if (!type) redirect("/bliv-medlem?fejl=Ukendt%20medlemstype");
  if (type.code === "YOUTH" && ageOn(profile.birthDate, new Date()) >= 18) {
    redirect(`/bliv-medlem?fejl=${encodeURIComponent("Ungdomskontingent gælder kun for medlemmer under 18 år")}`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { ...profile, guardianName: minor ? guardianName : null, guardianEmail: minor ? guardianEmail : null },
  });

  const payment = await prisma.payment.create({
    data: { userId: user.id, amountOre: type.priceOre, description: `Kontingent ${type.name}`, typeId: type.id },
  });

  // Under 18: betalingslinket sendes til forælder/værge i stedet for at gå direkte til betaling
  if (minor) {
    const { sent } = await sendPayLink(payment.id);
    redirect(sent ? "/bliv-medlem?sendt=1" : "/bliv-medlem?ikkesendt=1");
  }

  const base = await baseUrl();
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    locale: "da",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "dkk",
          unit_amount: type.priceOre,
          product_data: { name: `Medlemskab Nyborg Triathlon Klub – ${type.name}`, description: "Gælder 1 år" },
        },
      },
    ],
    metadata: { paymentId: payment.id, userId: user.id, typeId: type.id },
    payment_intent_data: { metadata: { paymentId: payment.id } },
    success_url: `${base}/min-side?betaling=ok`,
    cancel_url: `${base}/bliv-medlem?annulleret=1`,
  });

  await prisma.payment.update({ where: { id: payment.id }, data: { stripeCheckoutSessionId: session.id } });
  redirect(session.url!);
}

/** Send betalingslinket til forælderen igen (fx hvis mailen er blevet væk). */
export async function resendPayLink() {
  const user = await requireUser("/bliv-medlem");
  const p = await prisma.payment.findFirst({
    where: { userId: user.id, payToken: { not: null }, status: { in: ["PENDING", "FAILED"] } },
    orderBy: { createdAt: "desc" },
  });
  const sent = p ? (await sendPayLink(p.id)).sent : false;
  redirect(sent ? "/bliv-medlem?sendt=1" : "/bliv-medlem?ikkesendt=1");
}

const trialSchema = z.object({
  name: z.string().trim().min(2, "Skriv dit fulde navn"),
  phone: z.string().trim().min(8, "Skriv dit telefonnummer"),
  message: z.string().trim().max(1000).optional(),
});

export async function requestTrial(formData: FormData) {
  const user = await requireUser("/bliv-medlem");
  const parsed = trialSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/bliv-medlem?fejl=${encodeURIComponent(parsed.error.issues[0].message)}#proeve`);
  const existing = await prisma.trialRequest.findUnique({ where: { userId: user.id } });
  if (existing) redirect(`/bliv-medlem?fejl=${encodeURIComponent("Du har allerede søgt om en prøveperiode")}#proeve`);
  const { name, phone, message } = parsed.data;
  await prisma.user.update({ where: { id: user.id }, data: { name, phone } });
  await prisma.trialRequest.create({ data: { userId: user.id, message: message || null } });
  redirect("/bliv-medlem?besked=proeve#proeve");
}

export async function redeemCodeAction(formData: FormData) {
  const user = await requireUser("/bliv-medlem");
  const result = await redeemCode(user.id, String(formData.get("code") ?? ""));
  if (!result.ok) redirect(`/bliv-medlem?fejl=${encodeURIComponent(result.error)}#kode`);
  redirect("/min-side?kode=ok");
}
