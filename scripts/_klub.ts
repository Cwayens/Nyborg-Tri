// Fælles for scripts: vælg klub med --klub=<slug> eller miljøvariablen KLUB. Standard er standardklubben (DEFAULT_CLUB, ellers nyborg).
import { prismaUnscoped } from "../src/lib/db-base";
import { defaultClubSlug, runAsClub } from "../src/lib/tenant";

export function clubArg(): string {
  const a = process.argv.find((x) => x.startsWith("--klub="));
  return (a?.slice(7) || process.env.KLUB || defaultClubSlug()).trim().toLowerCase();
}

/** Kør fn som klubben valgt på kommandolinjen. */
export async function withClub<T>(fn: (club: { id: string; slug: string; name: string }) => Promise<T>, slug = clubArg()): Promise<T> {
  const club = await prismaUnscoped.club.findUnique({ where: { slug } });
  if (!club) throw new Error(`Klubben "${slug}" findes ikke. Opret den med: npm run klub -- opret ${slug} "Klubbens navn"`);
  try {
    return await runAsClub(club.id, () => fn(club));
  } finally {
    await prismaUnscoped.$disconnect();
  }
}
