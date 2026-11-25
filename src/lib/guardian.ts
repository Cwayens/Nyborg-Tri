// Medlemmer under 18 skal have en forælder/værge, som betaler og får kvitteringer og påmindelser.

export const ADULT_AGE = 18;

export function ageOn(birth: Date, on: Date): number {
  let age = on.getFullYear() - birth.getFullYear();
  const m = on.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < birth.getDate())) age--;
  return age;
}

export function needsGuardian(birthDate: Date | null, on = new Date()): boolean {
  return !!birthDate && ageOn(birthDate, on) < ADULT_AGE;
}

/** Den adresse, der skal have betalingslink, kvitteringer og påmindelser om fornyelse. */
export function billingEmail(u: { email: string; birthDate: Date | null; guardianEmail: string | null }, on = new Date()): string {
  return needsGuardian(u.birthDate, on) && u.guardianEmail ? u.guardianEmail : u.email;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isEmail(v: string): boolean {
  return EMAIL.test(v) && v.length <= 200;
}

/** Barn i klubben: under 18 eller i Børn-gruppen. Børn vises ikke for voksne i makker- og mentorordningen. */
export function isChild(u: { birthDate: Date | null; athleteGroup: string | null }, on = new Date()): boolean {
  return u.athleteGroup === "BOERN" || needsGuardian(u.birthDate, on);
}

/** Prisma-filter for brugere, der ikke er børn (ukendt fødselsdato tæller som voksen, medmindre gruppen er Børn). */
export function adultFilter(on = new Date()) {
  const cutoff = new Date(on.getFullYear() - ADULT_AGE, on.getMonth(), on.getDate());
  return {
    AND: [
      { OR: [{ athleteGroup: null }, { athleteGroup: { in: ["ELITE", "BREDDE"] as ("ELITE" | "BREDDE")[] } }] },
      { OR: [{ birthDate: null }, { birthDate: { lte: cutoff } }] },
    ],
  };
}
