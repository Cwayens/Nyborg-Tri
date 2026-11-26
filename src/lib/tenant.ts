import { AsyncLocalStorage } from "node:async_hooks";
import { prismaUnscoped } from "./db-base";

// Hvilken klub er vi? Platformen kører alle klubber fra én installation og én database.
//  1. Inde i runAsClub(id, fn) (cron, webhooks, scripts og tests): den klub.
//  2. Ellers ud fra domænet i forespørgslen: klubbens egne domæner (Club.domains), <slug>.<PLATFORM_DOMAIN>
//     eller <slug>.localhost under udvikling. Andre domæner (fx Vercels preview-adresser) giver standardklubben.
// Uden forespørgsel og uden runAsClub fejler det, så intet kan læses eller skrives uden en klub.

export type ClubRow = { id: string; slug: string; name: string; domains: string[]; active: boolean };

const als = new AsyncLocalStorage<{ clubId: string }>();

/** Kør fn som klubben clubId (uden for en forespørgsel, fx i cron, webhooks og scripts). */
export function runAsClub<T>(clubId: string, fn: () => Promise<T>): Promise<T> {
  // await inde i run(): Prisma-forespørgsler kører først, når de awaites, og skal køre mens klubben er valgt
  return als.run({ clubId }, async () => await fn());
}

/** Standardklubben (slug). Bruges for ukendte domæner, fx preview-adresser. */
export const defaultClubSlug = () => process.env.DEFAULT_CLUB?.trim() || "nyborg";

export class ClubNotFoundError extends Error {
  constructor(host: string) {
    super(`Ingen klub på ${host}`);
    this.name = "ClubNotFoundError";
  }
}

export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").split(",")[0].trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

/** Hvordan et domæne skal slås op: et bestemt slug, et eget domæne eller standardklubben. Ren funktion (testes). */
export function hostLookup(host: string, platformDomain = process.env.PLATFORM_DOMAIN): { slug: string } | { domain: string; fallback: string } {
  const h = normalizeHost(host);
  const platform = normalizeHost(platformDomain);
  for (const base of [platform, "localhost"].filter(Boolean)) {
    if (h.endsWith(`.${base}`)) {
      const sub = h.slice(0, -(base.length + 1));
      if (sub && !sub.includes(".") && sub !== "www") return { slug: sub };
    }
  }
  return { domain: h, fallback: defaultClubSlug() };
}

const TTL = 60_000;
const byHost = new Map<string, { club: ClubRow | null; at: number }>();
const SELECT = { id: true, slug: true, name: true, domains: true, active: true } as const;

/** Klubben for et domæne. Gemmes et minut ad gangen, så det kun koster en forespørgsel pr. minut pr. server. */
export async function clubForHost(host: string): Promise<ClubRow> {
  const key = normalizeHost(host);
  const hit = byHost.get(key);
  let club: ClubRow | null;
  if (hit && Date.now() - hit.at < TTL) club = hit.club;
  else {
    const q = hostLookup(key);
    if ("slug" in q) club = await prismaUnscoped.club.findUnique({ where: { slug: q.slug }, select: SELECT });
    else
      club =
        (key ? await prismaUnscoped.club.findFirst({ where: { domains: { has: key } }, select: SELECT }) : null) ??
        (await prismaUnscoped.club.findUnique({ where: { slug: q.fallback }, select: SELECT }));
    byHost.set(key, { club, at: Date.now() });
  }
  if (!club || !club.active) throw new ClubNotFoundError(key);
  return club;
}

/** Glem gemte opslag (efter en klub er oprettet eller har fået nyt domæne). */
export function forgetClubHosts() {
  byHost.clear();
}

async function requestHost(): Promise<string | null> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    return h.get("host") ?? h.get("x-forwarded-host");
  } catch (e) {
    // Kun "ikke i en forespørgsel" (scripts, tests) giver null. Next.js' egne signaler (fx at siden skal være dynamisk
    // under build) skal videre, ellers kunne en side blive bygget statisk og vist ens for alle klubber.
    if (e instanceof Error && /outside a request scope/i.test(e.message)) return null;
    throw e;
  }
}

/** Den aktuelle klubs id. Kaster en fejl, hvis klubben ikke kan afgøres. */
export async function currentClubId(): Promise<string> {
  const store = als.getStore();
  if (store) return store.clubId;
  const host = await requestHost();
  if (host === null) throw new Error("Klub-isolation: ingen klub valgt. Uden for en forespørgsel skal koden køre i runAsClub().");
  return (await clubForHost(host)).id;
}

/** Den aktuelle klub (id, slug, navn og domæner). */
export async function currentClub(): Promise<ClubRow> {
  const store = als.getStore();
  if (store) {
    const c = await prismaUnscoped.club.findUnique({ where: { id: store.clubId }, select: SELECT });
    if (!c) throw new Error(`Klub-isolation: klubben ${store.clubId} findes ikke`);
    return c;
  }
  const host = await requestHost();
  if (host === null) throw new Error("Klub-isolation: ingen klub valgt. Uden for en forespørgsel skal koden køre i runAsClub().");
  return clubForHost(host);
}

/** Alle aktive klubber (til cron-job, der skal køre for hver klub). */
export async function activeClubs(): Promise<ClubRow[]> {
  return prismaUnscoped.club.findMany({ where: { active: true }, select: SELECT, orderBy: { createdAt: "asc" } });
}

/** Kør fn for hver aktiv klub efter tur. Fejl i én klub stopper ikke de andre. */
export async function forEachClub<T>(fn: (club: ClubRow) => Promise<T>): Promise<{ club: string; result?: T; error?: string }[]> {
  const out: { club: string; result?: T; error?: string }[] = [];
  for (const club of await activeClubs()) {
    try {
      out.push({ club: club.slug, result: await runAsClub(club.id, () => fn(club)) });
    } catch (e) {
      out.push({ club: club.slug, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return out;
}
