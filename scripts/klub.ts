/**
 * Platformsadministration: opret klubber, domæner og klubbens egne nøgler. Kør mod produktionsdatabasen med DATABASE_URL.
 *
 *   npm run klub -- liste
 *   npm run klub -- opret <slug> "<navn>" [--domæne=klub.dk] [--admin=mail@klub.dk] [--eksempel]
 *   npm run klub -- domæne <slug> <domæne>           (tilføj)
 *   npm run klub -- domæne <slug> <domæne> --fjern
 *   npm run klub -- noegle <slug> <NAVN> <værdi>      (fx STRIPE_SECRET_KEY; tom værdi "" fjerner)
 *   npm run klub -- admin <slug> <mail>
 *   npm run klub -- luk <slug>  /  aabn <slug>       (lukket klub: siden svarer ikke, data bevares)
 *
 * Nye klubber får medlemstyper, hold (Elite, Bredde, Børn) og en neutral forside (--eksempel beholder Nyborgs
 * eksempeltekster, fx til en demo). Resten retter klubbens admin selv under Admin → Kom i gang.
 */
import { prismaUnscoped } from "../src/lib/db-base";
import { runAsClub } from "../src/lib/tenant";
import { createClub, ensureAdmins, setClubDomain } from "../src/lib/club-setup";
import { CLUB_ENV_KEYS, setClubEnv, type ClubEnvKey } from "../src/lib/club-secrets";

const [cmd, ...rest] = process.argv.slice(2);
const flags = Object.fromEntries(rest.filter((a) => a.startsWith("--")).map((a) => { const [k, v] = a.slice(2).split("="); return [k, v ?? "1"]; }));
const args = rest.filter((a) => !a.startsWith("--"));

async function club(slug: string) {
  const c = await prismaUnscoped.club.findUnique({ where: { slug } });
  if (!c) throw new Error(`Klubben "${slug}" findes ikke`);
  return c;
}

async function main() {
  switch (cmd) {
    case "liste": {
      for (const c of await prismaUnscoped.club.findMany({ orderBy: { createdAt: "asc" }, include: { _count: { select: { users: true } } } })) {
        console.log(`${c.active ? " " : "x"} ${c.slug.padEnd(16)} ${c.name.padEnd(32)} ${String(c._count.users).padStart(5)} brugere  ${c.domains.join(", ") || "-"}`);
      }
      break;
    }
    case "opret": {
      const [slug, name] = args;
      if (!slug || !name) throw new Error('Brug: opret <slug> "<navn>" [--domæne=...] [--admin=...]');
      const domain = flags["domæne"] ?? flags["domaene"];
      const c = await createClub({ slug, name, domains: domain ? domain.split(",") : [], admins: flags.admin ? flags.admin.split(",") : [], example: !!flags.eksempel });
      console.log(`Oprettet: ${c.slug} (${c.name}). Domæner: ${c.domains.join(", ") || "ingen"}`);
      if (process.env.PLATFORM_DOMAIN) console.log(`Adresse: https://${c.slug}.${process.env.PLATFORM_DOMAIN}`);
      break;
    }
    case "domæne":
    case "domaene": {
      const [slug, domain] = args;
      if (!slug || !domain) throw new Error("Brug: domæne <slug> <domæne> [--fjern]");
      const list = await setClubDomain(slug, domain, !flags.fjern);
      console.log(`${slug}: ${list.join(", ") || "ingen domæner"}`);
      console.log("Husk at tilføje domænet i Vercel (Project → Settings → Domains), så det får et certifikat.");
      break;
    }
    case "noegle":
    case "nøgle": {
      const [slug, name, value = ""] = args;
      if (!slug || !CLUB_ENV_KEYS.includes(name as ClubEnvKey)) throw new Error(`Brug: noegle <slug> <NAVN> <værdi>. NAVN er en af: ${CLUB_ENV_KEYS.join(", ")}`);
      await setClubEnv((await club(slug)).id, name as ClubEnvKey, value);
      console.log(`${slug}: ${name} ${value ? "sat" : "fjernet"}`);
      break;
    }
    case "admin": {
      const [slug, email] = args;
      if (!slug || !email) throw new Error("Brug: admin <slug> <mail>");
      await runAsClub((await club(slug)).id, () => ensureAdmins([email]));
      console.log(`${email} er admin i ${slug}`);
      break;
    }
    case "luk":
    case "aabn": {
      const c = await club(args[0] ?? "");
      await prismaUnscoped.club.update({ where: { id: c.id }, data: { active: cmd === "aabn" } });
      console.log(`${c.slug} er ${cmd === "aabn" ? "åbnet" : "lukket"}`);
      break;
    }
    default:
      console.log("Kommandoer: liste, opret, domæne, noegle, admin, luk, aabn (se øverst i scripts/klub.ts)");
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prismaUnscoped.$disconnect());
