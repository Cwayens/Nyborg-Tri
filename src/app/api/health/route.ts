import { prisma } from "@/lib/db";

// Til oppetidsovervågning (fx UptimeRobot): svarer 200, når siden og databasen virker, ellers 503.
export const dynamic = "force-dynamic";

export async function GET() {
  const t = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: "ok", ms: Date.now() - t }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, db: "fejl" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
