import { runBackup } from "@/lib/backup";
import { prisma } from "@/lib/db";
import { alert } from "@/lib/alert";
import { forEachClub } from "@/lib/tenant";

// Kører hver nat via Vercel Cron (vercel.json): sikkerhedskopi af hver klubs data og oprydning efter privatlivspolitikken.
// Én kørsel for hele platformen; hver klub behandles for sig (forEachClub), så en fejl i én klub ikke stopper de andre.
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const results = await forEachClub(async () => {
    // Henvendelser fra kontaktformularen gemmes i 1 år
    const cleaned = await prisma.contactMessage.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 365 * 86400_000) } } });
    const r = await runBackup();
    return { rows: r.rows, kb: Math.round(r.bytes / 1024), deletedBackups: r.deleted, deletedContactMessages: cleaned.count };
  });
  const failed = results.filter((r) => r.error);
  if (failed.length) await alert("Natlig backup fejlede", new Error(failed.map((f) => `${f.club}: ${f.error}`).join("\n")));
  return Response.json({ ok: !failed.length, results }, { status: failed.length ? 500 : 200 });
}
