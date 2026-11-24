import { handleWebhookEvent } from "@/lib/wearables/strava";

// Strava webhook. Opsætning (én gang):
// curl -X POST https://www.strava.com/api/v3/push_subscriptions \
//   -F client_id=... -F client_secret=... -F callback_url=https://<domæne>/api/wearables/strava/webhook -F verify_token=$STRAVA_VERIFY_TOKEN

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  if (q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") && q.get("hub.verify_token") === process.env.STRAVA_VERIFY_TOKEN) {
    return Response.json({ "hub.challenge": q.get("hub.challenge") });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const event = await req.json().catch(() => null);
  if (!event?.owner_id) return new Response("Bad request", { status: 400 });
  // Strava forventer svar inden for 2 sekunder; fejl logges men kvitteres, så Strava ikke bliver ved
  try {
    await handleWebhookEvent(event);
  } catch (e) {
    console.error("Strava webhook", e);
  }
  return Response.json({ ok: true });
}
