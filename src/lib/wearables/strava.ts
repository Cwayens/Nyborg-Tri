import type { Discipline } from "@prisma/client";
import { prisma } from "@/lib/db";

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

/** Henter aktiviteter siden sidste synk (første gang: 60 dage tilbage). */
export async function syncRecent(userId: string): Promise<number> {
  const c = await prisma.wearableConnection.findUnique({ where: { userId_provider: { userId, provider: "STRAVA" } } });
  if (!c) return 0;
  const since = c.lastSyncAt ? new Date(c.lastSyncAt.getTime() - 3 * 24 * 3600 * 1000) : new Date(Date.now() - 60 * 24 * 3600 * 1000);
  let count = 0;
  for (let page = 1; page <= 5; page++) {
    const list = await api<StravaActivity[]>(c.id, `/athlete/activities?after=${Math.floor(since.getTime() / 1000)}&per_page=100&page=${page}`);
    for (const a of list) {
      const data = toActivityData(userId, a);
      await prisma.activity.upsert({ where: { provider_externalId: { provider: "STRAVA", externalId: data.externalId } }, update: data, create: data });
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
    await prisma.activity.deleteMany({ where: { provider: "STRAVA", externalId } });
    return;
  }
  const a = await api<StravaActivity>(c.id, `/activities/${e.object_id}`);
  const data = toActivityData(c.userId, a);
  await prisma.activity.upsert({ where: { provider_externalId: { provider: "STRAVA", externalId } }, update: data, create: data });
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
