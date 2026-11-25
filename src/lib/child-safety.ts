import { cache } from "react";
import type { AthleteGroup, Prisma, Role } from "@prisma/client";
import { prisma } from "./db";

// Børnesikkerhed: børn (atleter på et børnehold) må kun møde trænere, admin og andre børn i platformen.
// 1) Fællesskabsfunktionerne er slået fra for børn (menu, sider og handlinger, se featuresOff).
// 2) Voksne ser aldrig børn i lister over deltagere, makkere, mentorer, ranglister og statistik (NOT_CHILD).
// 3) Databasen fjerner et barns spor i fællesskabsfunktionerne, når det kommer på et børnehold (migration 20261125070000).

/** Funktioner, børn ikke har adgang til, fordi de bringer dem i kontakt med voksne medlemmer. */
export const CHILD_BLOCKED = ["traensammen", "makker", "mentor", "leaderboard", "statistik", "udfordringer", "staevner"] as const;

export function isChild(u: { role: Role; athleteGroup: AthleteGroup | null } | null | undefined): boolean {
  return !!u && u.role === "ATHLETE" && u.athleteGroup === "BOERN";
}

/** Brugerfilter, der udelukker børn. Skrevet med OR, så brugere uden gruppe (NULL) kommer med. */
export const NOT_CHILD: Prisma.UserWhereInput = { OR: [{ role: { not: "ATHLETE" } }, { athleteGroup: null }, { athleteGroup: { not: "BOERN" } }] };

/** Er den, der er logget ind, et barn? Slås op i databasen, ikke i sessionen. Uden for en forespørgsel: nej. */
export const viewerIsChild = cache(async (): Promise<boolean> => {
  try {
    const { auth } = await import("@/auth");
    const id = (await auth())?.user?.id;
    if (!id) return false;
    return isChild(await prisma.user.findUnique({ where: { id }, select: { role: true, athleteGroup: true } }));
  } catch {
    return false;
  }
});
