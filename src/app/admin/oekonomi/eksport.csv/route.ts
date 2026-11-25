import { auth } from "@/auth";
import { isTreasurer, staffOf } from "@/lib/staff";
import { exportRows } from "@/lib/finance-db";
import { toCsv } from "@/lib/finance";
import { CLUB } from "@/lib/club";

// Alle posteringer i et år som CSV til bogføringsprogrammet (kun kasserer og admin)
export async function GET(req: Request) {
  const me = await staffOf((await auth())?.user?.id);
  if (!isTreasurer(me)) return new Response("Kun for kasserer og admin", { status: 403 });
  const y = Number(new URL(req.url).searchParams.get("aar"));
  const year = y >= 2000 && y <= 2100 ? y : new Date().getFullYear();
  const slug = CLUB.shortName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return new Response(toCsv(await exportRows(year)), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-regnskab-${year}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
