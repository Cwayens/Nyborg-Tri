import { cache } from "react";
import type { Discipline, Prisma } from "@prisma/client";
import { prisma } from "./db";
import { PLACES, baseClub, mergeClub, type ClubConfig, type ClubOverrides, type Place } from "./club";
import { currentClub, currentClubId, defaultClubSlug } from "./tenant";
import { clubEnv } from "./club-secrets";
import { ROUTES, type Route } from "./routes";
import type { Locale } from "./i18n-core";
import { DEFAULT_ABOUT, DEFAULT_ABOUT_EN, DEFAULT_HOME, DEFAULT_HOME_EN, DEFAULT_PRIVACY, type AboutContent, type HomeContent, type PrivacyContent } from "@/data/site-default";

// Klubbens eget indhold, som admin retter under Admin → Klubben: oplysninger, farver, forside, Om klubben,
// træningssteder, ruter og privatlivspolitik. Gemmes i Setting-tabellen; det der ikke er gemt, tager standarden.

export const SITE_KEYS = {
  club: "site_club", home: "site_home", about: "site_about", privacy: "site_privacy", places: "site_places", routes: "site_routes",
  // Engelske udgaver af teksterne (valgfrie)
  home_en: "site_home_en", about_en: "site_about_en", privacy_en: "site_privacy_en",
} as const;
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
  return { get };
});

// Klubbens oplysninger gemmes et halvt minut pr. klub, så sider og mails ikke spørger databasen hver gang
const clubCache = new Map<string, { club: ClubConfig; at: number }>();

/**
 * Den aktuelle klubs navn, logo, farver og kontaktoplysninger: udgangspunktet (se baseClub) med det, admin har gemt
 * under Admin → Klubben, ovenpå. Ændringer slår igennem inden for et halvt minut uden ny udgivelse.
 */
export async function getClub(): Promise<ClubConfig> {
  const club = await currentClub();
  const hit = clubCache.get(club.id);
  if (hit && Date.now() - hit.at < 30_000) return hit.club;
  const row = await prisma.setting.findFirst({ where: { key: SITE_KEYS.club } }).catch(() => null);
  const merged = mergeClub(baseClub(club, club.slug === defaultClubSlug()), obj(row?.value) as ClubOverrides | null);
  clubCache.set(club.id, { club: merged, at: Date.now() });
  return merged;
}

/** Klubbens udgangspunkt (før admins ændringer), fx til pladsholdere i Admin → Klubben. */
export async function getClubBase(): Promise<ClubConfig> {
  const club = await currentClub();
  return baseClub(club, club.slug === defaultClubSlug());
}

/** Glem den gemte udgave af klubbens oplysninger (efter admin har ændret dem). */
export async function forgetClubConfig(): Promise<void> {
  clubCache.delete(await currentClubId());
}

/** Hvor kontaktformularen sendes hen: klubbens CONTACT_EMAIL, ellers klubbens mail. */
export async function contactInbox(): Promise<string> {
  return (await clubEnv("CONTACT_EMAIL")) || (await getClub()).email;
}


export async function getClubOverrides(): Promise<ClubOverrides> {
  return (obj((await load()).get("club")) ?? {}) as ClubOverrides;
}
/**
 * Tekst på det valgte sprog. Engelsk: klubbens engelske tekst, ellers klubbens danske tekst (hvis den har skrevet sin egen),
 * ellers den engelske standard. Felter, der mangler på engelsk, tager den danske tekst.
 */
async function localized<T extends object>(key: "home" | "about" | "privacy", da: T, en: T, loc: Locale): Promise<T> {
  const { get } = await load();
  const saved = get(key);
  if (loc !== "en") return overlay(da, saved);
  return overlay(saved ? overlay(da, saved) : en, get(`${key}_en`));
}
export async function getHome(loc: Locale = "da"): Promise<HomeContent> {
  return localized("home", DEFAULT_HOME, DEFAULT_HOME_EN, loc);
}
export async function getAbout(loc: Locale = "da"): Promise<AboutContent> {
  return localized("about", DEFAULT_ABOUT, DEFAULT_ABOUT_EN, loc);
}
export async function getPrivacy(loc: Locale = "da"): Promise<PrivacyContent> {
  return localized("privacy", DEFAULT_PRIVACY, DEFAULT_PRIVACY, loc);
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
  const clubId = await currentClubId();
  await prisma.setting.upsert({ where: { clubId_key: { clubId, key: SITE_KEYS[key] } }, update: { value: v }, create: { key: SITE_KEYS[key], value: v } });
  if (key === "club") clubCache.delete(clubId);
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
  if (obj((await prisma.setting.findFirst({ where: { key: SITE_KEYS.routes } }))?.value)?.useDefault === false) return;
  await prisma.clubRoute.createMany({
    data: ROUTES.map((r, i) => ({ id: r.id, name: r.name, sport: r.sport, tag: r.tag, desc: r.desc, km: r.km, pts: r.pts as unknown as Prisma.InputJsonValue, sortOrder: i })),
    skipDuplicates: true,
  });
}
