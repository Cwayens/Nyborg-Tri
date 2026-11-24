"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { TOPICS, contactInbox } from "@/lib/club";
import { isEmail } from "@/lib/guardian";

const back = (q: string) => redirect(`/om/kontakt?${q}#skriv`);

export async function sendContact(formData: FormData) {
  // Robotter udfylder det skjulte felt; vi lader som om det lykkedes
  if (String(formData.get("website") ?? "")) back("sendt=1");
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 30) || null;
  const t = String(formData.get("topic") ?? "");
  const topic = (TOPICS as readonly string[]).includes(t) ? t : null;
  const message = String(formData.get("message") ?? "").trim().slice(0, 4000);
  if (!name || !isEmail(email) || message.length < 5) back("fejl=" + encodeURIComponent("Skriv navn, en gyldig mail og en besked"));

  // Højst 3 beskeder i timen fra samme mail og 30 i alt, så formularen ikke kan bruges til spam
  const hourAgo = new Date(Date.now() - 3600_000);
  const [mine, all] = await Promise.all([
    prisma.contactMessage.count({ where: { email, createdAt: { gte: hourAgo } } }),
    prisma.contactMessage.count({ where: { createdAt: { gte: hourAgo } } }),
  ]);
  if (mine >= 3 || all >= 30) back("fejl=" + encodeURIComponent("Vi har fået mange beskeder lige nu. Prøv igen om lidt, eller skriv direkte på mail."));

  await prisma.contactMessage.create({ data: { name, email, phone, topic, message } });
  await sendMail(
    contactInbox(),
    `Ny henvendelse${topic ? ` (${topic})` : ""} fra ${name}`,
    `${name} <${email}>${phone ? `, tlf. ${phone}` : ""} skrev via nyborgtri.dk:\n\n${message}\n\nSvar direkte til ${email}. Alle henvendelser kan også ses under Admin > Kontakt.`,
  );
  back("sendt=1");
}
