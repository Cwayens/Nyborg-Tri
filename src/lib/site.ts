import { cache } from "react";
import type { Discipline, Prisma } from "@prisma/client";
import { prisma } from "./db";
import { PLACES, applyClubOverrides, type ClubOverrides, type Place } from "./club";
import { ROUTES, type Route } from "./routes";
import { DEFAULT_ABOUT, DEFAULT_HOME, DEFAULT_PRIVACY, type AboutContent, type HomeContent, type PrivacyContent } from "@/data/site-default";

// Klubbens eget indhold, som admin retter under Admin → Klubben: oplysninger, farver, forside, Om klubben,
// træningssteder, ruter og privatlivspolitik. Gemmes i Setting-tabellen; det der ikke er gemt, tager standarden.

export const SITE_KEYS = { club: "site_club", home: "site_home", about: "site_about", privacy: "site_privacy", places: "site_places", routes: "site_routes" } as const;
type Key = keyof typeof SITE_KEYS;

const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

/** Læg det gemte oven på standarden, felt for felt (kun felter med samme type). */
export function overlay<T extends object>(base: T, saved: unknown): T {
  const s = obj(saved);
  if (!s) return base;
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(base)) {
    if (!(k in s)) continue;
    const sv = s[k];
    if (Array.isArray(v) ? Array.isArray(sv) : typeof sv === typeof v && sv !== null) out[k] = obj(v) && obj(sv) ? overlay(v as object, sv) : sv;
  }
  return out as T;
}

const load = cache(async () => {
  const rows = await prisma.setting.findMany({ where: { key: { in: Object.values(SITE_KEYS) } } }).catch(() => []);
  const get = (k: Key) => rows.find((r) => r.key === SITE_KEYS[k])?.value;
  applyClubOverrides(obj(get("club")) as ClubOverrides | null);
  lastLoad = Date.now();
  return { get };
});

let lastLoad = 0;

/** Henter klubbens oplysninger fra databasen, så CLUB er opdateret. Kaldes af layoutet og ved opstart. */
export async function refreshClub(force = false): Promise<void> {
  if (!force && Date.now() - lastLoad < 30_000) return;
  const row = await prisma.setting.findUnique({ where: { key: SITE_KEYS.club } }).catch(() => null);
  applyClubOverrides(obj(row?.value) as ClubOverrides | null);
  lastLoad = Date.now();
}


export async function getClubOverrides(): Promise<ClubOverrides> {
  return (obj((await load()).get("club")) ?? {}) as ClubOverrides;
}
export async function getHome(): Promise<HomeContent> {
  return overlay(DEFAULT_HOME, (await load()).get("home"));
}
export async function getAbout(): Promise<AboutContent> {
  return overlay(DEFAULT_ABOUT, (await load()).get("about"));
}
export async function getPrivacy(): Promise<PrivacyContent> {
  return overlay(DEFAULT_PRIVACY, (await load()).get("privacy"));
}

const isPlace = (p: unknown): p is Place => {
  const o = obj(p);
  return !!o && typeof o.id === "string" && typeof o.name === "string" && typeof o.lat === "number" && typeof o.lng === "number";
};
export async function getPlaces(): Promise<Place[]> {
  const saved = (await load()).get("places");
  return Array.isArray(saved) ? saved.filter(isPlace) : PLACES;
}
/** Klubbens base: det sted, der er markeret som hjem, ellers det første. null hvis der ingen steder er. */
export async function getHomePlace(): Promise<Place | null> {
  const places = await getPlaces();
  return places.find((p) => p.home) ?? places[0] ?? null;
}

export async function saveSite(key: Key, value: unknown): Promise<void> {
  const v = value as Prisma.InputJsonValue;
  await prisma.setting.upsert({ where: { key: SITE_KEYS[key] }, update: { value: v }, create: { key: SITE_KEYS[key], value: v } });
  if (key === "club") applyClubOverrides(obj(value) as ClubOverrides);
}

// ---------- Ruter ----------

/** Klubbens ruter: dem admin har lagt ind, ellers standardruterne. */
export const getRoutes = cache(async (): Promise<Route[]> => {
  const rows = await prisma.clubRoute.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }).catch(() => null);
  // En ny klub starter uden Nyborgs ruter (se opstartsguiden)
  if (!rows || rows.length === 0) return obj((await load()).get("routes"))?.useDefault === false ? [] : ROUTES;
  return rows.map((r) => ({ id: r.id, name: r.name, sport: r.sport as Discipline, tag: r.tag, desc: r.desc, km: r.km, pts: r.pts as [number, number][], gpx: true }));
});

/** Første gang admin ændrer ruterne, kopieres standardruterne ind, så de kan rettes og slettes. */
export async function ensureRoutesCopied(): Promise<void> {
  if ((await prisma.clubRoute.count()) > 0) return;
  if (obj((await prisma.setting.findUnique({ where: { key: SITE_KEYS.routes } }))?.value)?.useDefault === false) return;
  await prisma.clubRoute.createMany({
    data: ROUTES.map((r, i) => ({ id: r.id, name: r.name, sport: r.sport, tag: r.tag, desc: r.desc, km: r.km, pts: r.pts as unknown as Prisma.InputJsonValue, sortOrder: i })),
    skipDuplicates: true,
  });
}
