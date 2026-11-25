import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { kr } from "@/lib/format";
import { sendMail } from "@/lib/mail";
import { baseUrl } from "@/lib/url";
import { getClub } from "@/lib/site";

/** Opretter (eller genbruger) et hemmeligt betalingslink og sender det til medlemmets forælder/værge. */
export async function sendPayLink(paymentId: string): Promise<{ url: string; sent: boolean }> {
  const CLUB = await getClub();
  const p = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { user: true } });
  const to = p.user.guardianEmail;
  if (!to) throw new Error("Medlemmet har ingen forælder/værge");
  const token = p.payToken ?? randomBytes(24).toString("base64url");
  await prisma.payment.update({ where: { id: p.id }, data: { payToken: token, payLinkSentTo: to } });
  const url = `${await baseUrl()}/betal/${token}`;
  const child = p.user.name ?? "dit barn";
  const sent = await sendMail(
    to,
    `Betaling af kontingent for ${child} – ${CLUB.name}`,
    [
      `Hej ${p.user.guardianName ?? ""}`.trim(),
      "",
      `${child} har meldt sig ind i ${CLUB.name} og har skrevet dig som forælder eller værge.`,
      `Kontingentet er ${kr(p.amountOre)} (${p.description}). Du kan betale med kort eller MobilePay her:`,
      "",
      url,
      "",
      "Kvitteringen og påmindelser om fornyelse sendes også til dig.",
      `Har du spørgsmål, så skriv til ${CLUB.email}.`,
      "",
      "Venlig hilsen",
      CLUB.name,
    ].join("\n"),
  );
  return { url, sent };
}
