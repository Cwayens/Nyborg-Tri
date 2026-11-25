import { prisma } from "./db";
import { prismaUnscoped } from "./db-base";
import { forgetClubHosts, runAsClub } from "./tenant";
import { saveSite } from "./site";
import { blankAbout, blankHome } from "@/data/site-default";

// Opret en ny klub på platformen med det, en klub skal have fra start: medlemstyper og hold.
// Bruges af scripts/klub.ts (platformsadministration) og prisma/seed.ts.

export const DEFAULT_MEMBERSHIP_TYPES = [
  { code: "ADULT", name: "Voksen", priceOre: 100000, sortOrder: 1, description: "Fuldt medlemskab, 18 år og op" },
  { code: "YOUTH", name: "Ung under 18 år", priceOre: 50000, sortOrder: 2, description: "Fuldt medlemskab for unge under 18 år" },
  { code: "PASSIVE", name: "Passiv", priceOre: 20000, sortOrder: 3, description: "Støttemedlem uden træning" },
];

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const DOMAIN = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export function validSlug(slug: string): boolean {
  return SLUG.test(slug) && !["www", "admin", "api", "app", "platform"].includes(slug);
}
export function normalizeDomain(d: string): string {
  return d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
}
export function validDomain(d: string): boolean {
  return DOMAIN.test(d);
}

/** Medlemstyper og hold, hvis klubben ikke har nogen. Kan køres flere gange. Skal køre i runAsClub. */
export async function ensureClubBasics(): Promise<void> {
  if ((await prisma.membershipType.count()) === 0) {
    await prisma.membershipType.createMany({ data: DEFAULT_MEMBERSHIP_TYPES });
  }
  if ((await prisma.team.count()) === 0) {
    const bredde = await prisma.team.create({ data: { name: "Bredde", kind: "BREDDE", public: true, sortOrder: 2 } });
    await prisma.team.create({ data: { name: "Elite", kind: "ELITE", sees: [bredde.id], sortOrder: 1 } });
    await prisma.team.create({ data: { name: "Børn", kind: "BOERN", sortOrder: 3 } });
  }
}

/** Gør brugere med disse mails til admin i klubben (opretter dem, hvis de ikke findes). Skal køre i runAsClub. */
export async function ensureAdmins(emails: string[]): Promise<void> {
  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (!email) continue;
    const u = await prisma.user.findFirst({ where: { email }, select: { id: true } });
    if (u) await prisma.user.update({ where: { id: u.id }, data: { role: "ADMIN" } });
    else await prisma.user.create({ data: { email, role: "ADMIN" } });
  }
}

/** Neutral forside og Om klubben, ingen træningssteder eller ruter (i stedet for Nyborgs eksempelindhold). Skal køre i runAsClub. */
export async function clearExampleContent(clubName: string): Promise<void> {
  await saveSite("home", blankHome(clubName));
  await saveSite("about", blankAbout(clubName));
  await saveSite("places", []);
  await saveSite("routes", { useDefault: false });
  await prisma.clubRoute.deleteMany({});
}

/**
 * Opretter en klub med medlemstyper, hold og admins, og uden Nyborgs eksempeltekster (medmindre example er sat).
 * Fejler, hvis slug eller domæne allerede er i brug.
 */
export async function createClub(args: { slug: string; name: string; domains?: string[]; admins?: string[]; example?: boolean }) {
  const slug = args.slug.trim().toLowerCase();
  if (!validSlug(slug)) throw new Error(`Ugyldigt slug "${args.slug}": brug små bogstaver, tal og bindestreg`);
  const name = args.name.trim();
  if (!name) throw new Error("Klubben skal have et navn");
  const domains = (args.domains ?? []).map(normalizeDomain).filter(Boolean);
  for (const d of domains) {
    if (!validDomain(d)) throw new Error(`Ugyldigt domæne "${d}"`);
    if (await prismaUnscoped.club.findFirst({ where: { domains: { has: d } } })) throw new Error(`Domænet ${d} bruges allerede af en anden klub`);
  }
  const club = await prismaUnscoped.club.create({ data: { slug, name, domains } });
  await runAsClub(club.id, async () => {
    await ensureClubBasics();
    await ensureAdmins(args.admins ?? []);
    if (!args.example) await clearExampleContent(name);
  });
  forgetClubHosts();
  return club;
}

/** Tilføj eller fjern et domæne for en klub. */
export async function setClubDomain(slug: string, domain: string, add: boolean) {
  const d = normalizeDomain(domain);
  if (add && !validDomain(d)) throw new Error(`Ugyldigt domæne "${domain}"`);
  const club = await prismaUnscoped.club.findUniqueOrThrow({ where: { slug } });
  if (add) {
    const other = await prismaUnscoped.club.findFirst({ where: { domains: { has: d }, NOT: { id: club.id } } });
    if (other) throw new Error(`Domænet ${d} bruges allerede af ${other.slug}`);
  }
  const domains = add ? [...new Set([...club.domains, d])] : club.domains.filter((x) => x !== d);
  await prismaUnscoped.club.update({ where: { id: club.id }, data: { domains } });
  forgetClubHosts();
  return domains;
}
