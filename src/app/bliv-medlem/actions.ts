"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, signIn } from "@/auth";
import { loginLinkAllowed } from "@/lib/login-limit";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { redeemCode } from "@/lib/access";
import { baseUrl } from "@/lib/url";
import { ageOn, isEmail, needsGuardian } from "@/lib/guardian";
import { sendPayLink } from "@/lib/paylink";
import { getClub } from "@/lib/site";
import { isOn } from "@/lib/features";
import { notifyClubWantsMentor } from "@/lib/mentor";

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

  redirect(await checkoutUrl(payment.id, user.id, user.email ?? undefined, type, "/min-side?betaling=ok"));
}

/** Opretter en Stripe-betaling for kontingentet og returnerer adressen, man sendes til. */
async function checkoutUrl(paymentId: string, userId: string, email: string | undefined, type: { id: string; name: string; priceOre: number }, success: string) {
  const CLUB = await getClub();
  const base = await baseUrl();
  const session = await (await stripe()).checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    locale: "da",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "dkk",
          unit_amount: type.priceOre,
          product_data: { name: `Medlemskab ${CLUB.name} – ${type.name}`, description: "Gælder 1 år" },
        },
      },
    ],
    metadata: { paymentId, userId, typeId: type.id },
    payment_intent_data: { metadata: { paymentId } },
    success_url: `${base}${success}`,
    cancel_url: `${base}/bliv-medlem?annulleret=1`,
  });
  await prisma.payment.update({ where: { id: paymentId }, data: { stripeCheckoutSessionId: session.id } });
  return session.url!;
}

// --- Indmeldelse uden at være logget ind ---

const guestSchema = schema.extend({
  email: z.string().trim().toLowerCase().max(200),
  plan: z.enum(["pay", "trial"]),
  message: z.string().trim().max(1000).optional(),
});

const guestFail = (m: string) => redirect(`/bliv-medlem?fejl=${encodeURIComponent(m)}#meld-ind`);

/** Sender et login-link uden at afsløre, om mailen allerede findes. */
async function sendLoginLink(email: string, redirectTo: string) {
  if (!(await loginLinkAllowed(email))) return;
  try {
    await signIn("nodemailer", { email, redirect: false, redirectTo });
  } catch (e) {
    console.error("[bliv-medlem] login-link kunne ikke sendes", e);
  }
}

/**
 * Indmeldelse i ét forløb: navn, mail og betaling (eller prøveperiode) uden at logge ind først.
 * Vi opretter profilen og sender et login-link til mailen. Findes mailen allerede, får personen kun et login-link,
 * så ingen kan ændre en andens profil ved at skrive deres mail.
 */
export async function joinAsGuest(formData: FormData) {
  if (String(formData.get("website") ?? "")) redirect("/login/tjek-mail");
  const plan = formData.get("plan") === "trial" ? "trial" : "pay";
  const parsed = guestSchema.safeParse({ ...Object.fromEntries(formData), plan, typeCode: formData.get("typeCode") || "ADULT" });
  if (!parsed.success) guestFail(parsed.error.issues[0].message);
  const { email, typeCode, guardianName, guardianEmail, message, plan: _plan, ...profile } = parsed.data!;
  if (!isEmail(email)) guestFail("Skriv en gyldig e-mail");

  const existing = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  if (existing) {
    await sendLoginLink(email, "/bliv-medlem");
    redirect("/bliv-medlem/tjek-mail?findes=1");
  }

  // Bremse mod misbrug: højst 30 nye profiler i timen via formularen
  const recent = await prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 3600_000) }, emailVerified: null } });
  if (recent >= 30) guestFail("Der er mange indmeldelser lige nu. Prøv igen om lidt.");

  const minor = needsGuardian(profile.birthDate);
  if (minor) {
    if (!guardianName || guardianName.length < 2) guestFail("Skriv navnet på en forælder eller værge");
    if (!guardianEmail || !isEmail(guardianEmail)) guestFail("Skriv e-mail til en forælder eller værge");
    if (guardianEmail === email) guestFail("Forælderens e-mail skal være en anden end barnets");
  }
  const type = plan === "pay" ? await prisma.membershipType.findFirst({ where: { code: typeCode, active: true } }) : null;
  if (plan === "pay" && !type) guestFail("Vælg en medlemstype");
  if (type?.code === "YOUTH" && ageOn(profile.birthDate, new Date()) >= 18) guestFail("Ungdomskontingent gælder kun for medlemmer under 18 år");

  // Ønske om mentor: kun voksne, og kun når mentorordningen er slået til. Mentoren tildeles, når medlemmet har adgang (Overblik).
  const wantsMentor = !minor && formData.get("wantsMentor") === "on" && (await isOn("mentor"));
  const user = await prisma.user.create({
    data: { email, ...profile, guardianName: minor ? guardianName : null, guardianEmail: minor ? guardianEmail : null, wantsMentor },
  });
  if (wantsMentor) await notifyClubWantsMentor(profile.name, "ny").catch((e) => console.error("[bliv-medlem] mentor-besked", e));

  if (plan === "trial") {
    await prisma.trialRequest.create({ data: { userId: user.id, message: message || null } });
    await sendLoginLink(email, "/min-side");
    redirect("/bliv-medlem/tjek-mail?proeve=1");
  }

  const payment = await prisma.payment.create({
    data: { userId: user.id, amountOre: type!.priceOre, description: `Kontingent ${type!.name}`, typeId: type!.id },
  });
  await sendLoginLink(email, "/min-side");
  if (minor) {
    const { sent } = await sendPayLink(payment.id);
    redirect(`/bliv-medlem/tjek-mail?foraelder=${sent ? 1 : 0}`);
  }
  let url: string | null = null;
  try {
    url = await checkoutUrl(payment.id, user.id, email, type!, "/bliv-medlem/tjek-mail?betalt=1");
  } catch (e) {
    console.error("[bliv-medlem] Stripe fejlede", e);
  }
  // Profilen er oprettet; kan betalingen ikke startes, logger personen ind med linket og betaler derfra
  redirect(url ?? "/bliv-medlem/tjek-mail?betalingsfejl=1");
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
