import nodemailer from "nodemailer";
import { CLUB } from "@/lib/club";

// Sender mails via EMAIL_SERVER (samme SMTP som login-links). Uden EMAIL_SERVER skrives mailen i loggen,
// så testversionen stadig kan bruges.
export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  const server = process.env.EMAIL_SERVER;
  if (!server) {
    console.warn(`[mail] EMAIL_SERVER mangler – mail til ${to}: ${subject}\n${text}`);
    return false;
  }
  try {
    await nodemailer.createTransport(server).sendMail({
      from: process.env.EMAIL_FROM ?? `${CLUB.name} <noreply@${CLUB.domain || "localhost"}>`,
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
