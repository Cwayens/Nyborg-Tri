import { processPending } from "@/lib/wearables/strava";
import { forEachClub } from "@/lib/tenant";

// Kører via Vercel Cron (se vercel.json). Udtrækker bedste præstationer fra ture, der endnu ikke er tjekket, klub for klub.
// Vercel sender "Authorization: Bearer $CRON_SECRET".
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const limit = Math.min(Number(process.env.EFFORTS_PER_RUN) || 80, 90);
  return Response.json(await forEachClub(() => processPending(limit)));
}
