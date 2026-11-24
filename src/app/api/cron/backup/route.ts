import { runBackup } from "@/lib/backup";
import { prisma } from "@/lib/db";
import { alert } from "@/lib/alert";

// Kører hver nat via Vercel Cron (vercel.json): sikkerhedskopi af databasen og oprydning efter privatlivspolitikken.
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  // Henvendelser fra kontaktformularen gemmes i 1 år
  const cleaned = await prisma.contactMessage.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 365 * 86400_000) } } });
  try {
    const r = await runBackup();
    return Response.json({ ok: true, rows: r.rows, kb: Math.round(r.bytes / 1024), deletedBackups: r.deleted, deletedContactMessages: cleaned.count });
  } catch (e) {
    await alert("Natlig backup fejlede", e);
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
