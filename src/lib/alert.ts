import { sendMail } from "./mail";

// Mail til den driftsansvarlige (ALERT_EMAIL), når noget går galt på serveren.
// Samme fejl mailes højst én gang i timen pr. server, så en fejl i løkke ikke fylder indbakken.
const lastSent = new Map<string, number>();
const QUIET_MS = 60 * 60 * 1000;

export async function alert(subject: string, error: unknown, context?: string): Promise<void> {
  const to = process.env.ALERT_EMAIL;
  const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`[alert] ${subject}`, error);
  if (!to) return;
  const key = `${subject}|${msg.slice(0, 200)}`;
  const now = Date.now();
  if ((lastSent.get(key) ?? 0) > now - QUIET_MS) return;
  lastSent.set(key, now);
  const stack = error instanceof Error && error.stack ? `\n\n${error.stack.split("\n").slice(0, 8).join("\n")}` : "";
  await sendMail(to, `[NyborgTri] ${subject}`, `${msg}${context ? `\n\nHvor: ${context}` : ""}${stack}\n\nSe hele loggen i Vercel → Logs.`);
}
