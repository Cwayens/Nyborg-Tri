import nodemailer from "nodemailer";
import { getClub } from "@/lib/site";

// Sender mails via EMAIL_SERVER (samme SMTP som login-links). Uden EMAIL_SERVER skrives mailen i loggen,
// så testversionen stadig kan bruges. Afsenderen er platformens adresse (EMAIL_FROM) med klubbens navn, og svar går
// til klubbens mail, så alle klubber kan dele ét afsenderdomæne.
export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  const server = process.env.EMAIL_SERVER;
  if (!server) {
    console.warn(`[mail] EMAIL_SERVER mangler – mail til ${to}: ${subject}\n${text}`);
    return false;
  }
  const club = await getClub().catch(() => null);
  const address = process.env.EMAIL_FROM?.match(/<([^>]+)>/)?.[1] ?? process.env.EMAIL_FROM ?? `noreply@${club?.domain || "localhost"}`;
  try {
    await nodemailer.createTransport(server).sendMail({
      from: club ? `"${club.name.replace(/"/g, "")}" <${address}>` : address,
      ...(club?.email ? { replyTo: club.email } : {}),
      to,
      subject,
      text,
    });
    return true;
  } catch (e) {
    console.error(`[mail] kunne ikke sende til ${to}: ${subject}`, e);
    return false;
  }
}
