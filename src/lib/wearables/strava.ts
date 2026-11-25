import type { Discipline } from "@prisma/client";
import { prisma } from "@/lib/db";
import { extractEfforts, worthChecking, type Streams } from "@/lib/efforts";

// Strava API v3. Docs: https://developers.strava.com/docs/
const AUTH_URL = "https://www.strava.com/oauth/authorize";
const TOKEN_URL = "https://www.strava.com/oauth/token";
const API = "https://www.strava.com/api/v3";

export type StravaActivity = {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  start_date: string;
  moving_time: number;
  distance: number;
  total_elevation_gain?: number;
  average_heartrate?: number;
  device_watts?: boolean;
};

const SPORT_MAP: Record<string, Discipline> = {
  Swim: "SWIM",
  Ride: "BIKE", VirtualRide: "BIKE", GravelRide: "BIKE", MountainBikeRide: "BIKE", EBikeRide: "BIKE", EMountainBikeRide: "BIKE", Velomobile: "BIKE", Handcycle: "BIKE",
  Run: "RUN", TrailRun: "RUN", VirtualRun: "RUN",
  WeightTraining: "STRENGTH", Crossfit: "STRENGTH", Workout: "STRENGTH",
};

export function mapSport(a: Pick<StravaActivity, "sport_type" | "type">): Discipline {
  return SPORT_MAP[a.sport_type ?? ""] ?? SPORT_MAP[a.type ?? ""] ?? "OTHER";
}

export function toActivityData(userId: string, a: StravaActivity) {
  return {
    userId,
    provider: "STRAVA" as const,
    externalId: String(a.id),
    sport: mapSport(a),
    name: a.name.slice(0, 200),
    startAt: new Date(a.start_date),
    movingSec: Math.round(a.moving_time),
    distanceM: Math.round(a.distance ?? 0),
    elevationM: Math.round(a.total_elevation_gain ?? 0),
    avgHr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
    hasPower: !!a.device_watts,
  };
}

function creds() {
  const id = process.env.STRAVA_CLIENT_ID;
  const secret = process.env.STRAVA_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Strava er ikke sat op (STRAVA_CLIENT_ID/STRAVA_CLIENT_SECRET)");
  return { id, secret };
}

export function authorizeUrl(redirectUri: string, state: string): string {
  const q = new URLSearchParams({
    client_id: creds().id, redirect_uri: redirectUri, response_type: "code",
    approval_prompt: "auto", scope: "read,activity:read", state,
  });
  return `${AUTH_URL}?${q}`;
}

type TokenResponse = { access_token: string; refresh_token: string; expires_at: number; athlete?: { id: number } };

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const { id, secret } = creds();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: id, client_secret: secret, ...body }),
  });
  if (!res.ok) throw new StravaError(res.status, "/oauth/token");
  return res.json();
}

export async function connectWithCode(userId: string, code: string, scope: string | null) {
  const t = await tokenRequest({ code, grant_type: "authorization_code" });
  if (!t.athlete) throw new Error("Strava returnerede ingen atlet");
  const data = {
    externalAthleteId: String(t.athlete.id), accessToken: t.access_token, refreshToken: t.refresh_token,
    expiresAt: new Date(t.expires_at * 1000), scope,
  };
  // En Strava-konto kan kun være forbundet til én bruger
  await prisma.wearableConnection.deleteMany({ where: { provider: "STRAVA", externalAthleteId: data.externalAthleteId, NOT: { userId } } });
  return prisma.wearableConnection.upsert({
    where: { userId_provider: { userId, provider: "STRAVA" } },
    update: data,
    create: { userId, provider: "STRAVA", ...data },
  });
}

async function validToken(connectionId: string): Promise<string> {
  const c = await prisma.wearableConnection.findUniqueOrThrow({ where: { id: connectionId } });
  if (c.expiresAt && c.expiresAt.getTime() > Date.now() + 60_000) return c.accessToken;
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: c.refreshToken ?? "" });
  await prisma.wearableConnection.update({
    where: { id: c.id },
    data: { accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: new Date(t.expires_at * 1000) },
  });
  return t.access_token;
}

class StravaError extends Error {
  constructor(public status: number, path: string) {
    super(`Strava ${path}: ${status}`);
  }
}

async function api<T>(connectionId: string, path: string): Promise<T> {
  const token = await validToken(connectionId);
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new StravaError(res.status, path);
  return res.json();
}

/** Webhooks fra Strava er ikke signerede, så sletninger bekræftes hos Strava, før vi handler på dem. */
async function confirmGone(connectionId: string, path: string): Promise<boolean> {
  try {
    await api(connectionId, path);
    return false;
  } catch (e) {
    return e instanceof StravaError && (e.status === 404 || e.status === 401);
  }
}

/** Første gang hentes alt fra 1. januar sidste år, så "mest fremgang" kan sammenligne med sidste år. */
function firstSyncFrom(): Date {
  return new Date(new Date().getFullYear() - 1, 0, 1);
}

/** Henter aktiviteter siden sidste synk. Bedste præstationer udtrækkes bagefter i processEfforts. */
export async function syncRecent(userId: string): Promise<number> {
  const c = await prisma.wearableConnection.findUnique({ where: { userId_provider: { userId, provider: "STRAVA" } } });
  if (!c) return 0;
  const since = c.lastSyncAt ? new Date(c.lastSyncAt.getTime() - 3 * 24 * 3600 * 1000) : firstSyncFrom();
  let count = 0;
  for (let page = 1; page <= 10; page++) {
    const list = await api<StravaActivity[]>(c.id, `/athlete/activities?after=${Math.floor(since.getTime() / 1000)}&per_page=100&page=${page}`);
    for (const a of list) {
      const data = toActivityData(userId, a);
      await upsertActivity(data);
      count++;
    }
    if (list.length < 100) break;
  }
  await prisma.wearableConnection.update({ where: { id: c.id }, data: { lastSyncAt: new Date() } });
  return count;
}

/** Håndterer én webhook-hændelse fra Strava. */
export async function handleWebhookEvent(e: { object_type: string; aspect_type: string; object_id: number; owner_id: number; updates?: Record<string, string> }) {
  const c = await prisma.wearableConnection.findUnique({ where: { provider_externalAthleteId: { provider: "STRAVA", externalAthleteId: String(e.owner_id) } } });
  if (!c) return;
  if (e.object_type === "athlete" && e.updates?.authorized === "false") {
    if (!(await confirmGone(c.id, "/athlete"))) return;
    // Medlemmet har fjernet adgangen på Strava: slet forbindelse og data
    await prisma.activity.deleteMany({ where: { userId: c.userId, provider: "STRAVA" } });
    await prisma.wearableConnection.delete({ where: { id: c.id } });
    return;
  }
  if (e.object_type !== "activity") return;
  const externalId = String(e.object_id);
  if (e.aspect_type === "delete") {
    if (!(await confirmGone(c.id, `/activities/${e.object_id}`))) return;
    await prisma.activity.deleteMany({ where: { provider: "STRAVA", externalId, userId: c.userId } });
    return;
  }
  const a = await api<StravaActivity>(c.id, `/activities/${e.object_id}`);
  const saved = await upsertActivity(toActivityData(c.userId, a));
  // Nye ture behandles med det samme, så leaderboard og Mine tests er opdateret
  await processActivity(saved.id).catch((err) => console.error("Strava efforts", err));
}

/** Gemmer en aktivitet. Ændres distance eller tid, skal præstationerne udtrækkes igen. */
async function upsertActivity(data: ReturnType<typeof toActivityData>) {
  const where = { provider_externalId: { provider: "STRAVA" as const, externalId: data.externalId } };
  const old = await prisma.activity.findUnique({ where, select: { distanceM: true, movingSec: true, sport: true } });
  const changed = !old || old.distanceM !== data.distanceM || old.movingSec !== data.movingSec || old.sport !== data.sport;
  return prisma.activity.upsert({ where, update: { ...data, ...(changed ? { effortsAt: null } : {}) }, create: data });
}

type StreamSet = { time?: { data: number[] }; distance?: { data: number[] }; watts?: { data: (number | null)[] } };

/** Udtrækker bedste præstationer (5 km, 20 min watt osv.) fra én aktivitet. Koster ét kald til Strava. */
export async function processActivity(activityId: string): Promise<number> {
  const a = await prisma.activity.findUniqueOrThrow({ where: { id: activityId } });
  let streams: Streams | null = null;
  if (a.provider === "STRAVA" && a.externalId && worthChecking(a)) {
    const c = await prisma.wearableConnection.findUnique({ where: { userId_provider: { userId: a.userId, provider: "STRAVA" } } });
    if (c) {
      const keys = a.hasPower ? "time,distance,watts" : "time,distance";
      try {
        const s = await api<StreamSet>(c.id, `/activities/${a.externalId}/streams?keys=${keys}&key_by_type=true`);
        streams = { time: s.time?.data, distance: s.distance?.data, watts: s.watts?.data };
      } catch (e) {
        // 429 = Stravas grænse for kald er nået; prøv igen ved næste kørsel
        if (e instanceof StravaError && e.status === 429) throw e;
      }
    }
  }
  // Kun data fra ure tæller, aldrig manuelt indtastede ture
  const found = a.provider !== "MANUAL" && worthChecking(a) ? extractEfforts(a, streams) : [];
  await prisma.$transaction([
    prisma.effort.deleteMany({ where: { activityId, test: { notIn: found.map((f) => f.test) } } }),
    ...found.map((f) =>
      prisma.effort.upsert({
        where: { activityId_test: { activityId, test: f.test } },
        update: { seconds: f.seconds, watts: f.watts, date: a.startAt },
        create: { activityId, userId: a.userId, test: f.test, seconds: f.seconds, watts: f.watts, date: a.startAt },
      }),
    ),
    prisma.activity.update({ where: { id: activityId }, data: { effortsAt: new Date() } }),
  ]);
  return found.length;
}

/**
 * Behandler aktiviteter, der endnu ikke er tjekket, nyeste først. Strava tillader ca. 100 kald pr. 15 min
 * og 1000 pr. dag for hele klubben, så det sker i små portioner.
 */
export async function processPending(limit: number, userId?: string): Promise<{ processed: number; remaining: number }> {
  const where = { effortsAt: null, provider: "STRAVA" as const, ...(userId ? { userId } : {}) };
  const list = await prisma.activity.findMany({ where, orderBy: { startAt: "desc" }, take: limit, select: { id: true } });
  let processed = 0;
  for (const { id } of list) {
    try {
      await processActivity(id);
      processed++;
    } catch (e) {
      if (e instanceof StravaError && e.status === 429) break;
      console.error("Strava efforts", id, e);
    }
  }
  return { processed, remaining: await prisma.activity.count({ where }) };
}

export async function disconnect(userId: string) {
  const c = await prisma.wearableConnection.findUnique({ where: { userId_provider: { userId, provider: "STRAVA" } } });
  if (!c) return;
  try {
    const token = await validToken(c.id);
    await fetch("https://www.strava.com/oauth/deauthorize", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  } catch {
    // Forbindelsen slettes hos os uanset hvad
  }
  await prisma.activity.deleteMany({ where: { userId, provider: "STRAVA" } });
  await prisma.wearableConnection.delete({ where: { id: c.id } });
}
