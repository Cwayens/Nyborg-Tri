// Testbrugere til gennemgang af siden. Kun aktive når DEMO_MODE=1.
import type { AthleteGroup, Duty, Role } from "@prisma/client";

export const DEMO_DOMAIN = "demo.nyborgtri.dk";

export const demoEnabled = () => process.env.DEMO_MODE === "1";

export type DemoUser = {
  key: string; name: string; role: Role; group: AthleteGroup | null; describe: string;
  membership: "ADULT" | "YOUTH" | null; source?: "PAYMENT" | "TRIAL" | "CODE"; trial?: "PENDING"; expired?: boolean; shares?: boolean; birthYear?: number; gender?: "MALE" | "FEMALE"; duties?: Duty[];
};

export const DEMO_USERS: DemoUser[] = [
  { key: "admin", name: "Anne Admin", role: "ADMIN", group: "ELITE", gender: "FEMALE", birthYear: 1979, membership: "ADULT", source: "PAYMENT", shares: true, describe: "Bestyrelse: medlemmer, betalinger, prøveperioder, koder og indhold" },
  { key: "traener", name: "Thomas Træner", role: "TRAINER", group: "BREDDE", gender: "MALE", birthYear: 1984, membership: "ADULT", source: "PAYMENT", shares: true, describe: "Træner: opretter og aflyser træninger, ser deltagere" },
  { key: "kasserer", name: "Kim Kasserer", role: "ATHLETE", group: "BREDDE", gender: "MALE", birthYear: 1968, membership: "ADULT", source: "PAYMENT", duties: ["TREASURER"], describe: "Kasserer: økonomi, betalinger og restancer, men ikke resten af administrationen" },
  { key: "elite", name: "Emil Elite", role: "ATHLETE", group: "ELITE", gender: "MALE", birthYear: 1997, membership: "ADULT", source: "PAYMENT", shares: true, describe: "Atlet i Elite-gruppen, betalt medlem med træningsdata" },
  { key: "bredde", name: "Berit Bredde", role: "ATHLETE", group: "BREDDE", gender: "FEMALE", birthYear: 1990, membership: "ADULT", source: "PAYMENT", shares: true, describe: "Atlet i Bredde-gruppen, betalt medlem med træningsdata" },
  { key: "boern", name: "Bo Barn", role: "ATHLETE", group: "BOERN", gender: "MALE", membership: "YOUTH", source: "PAYMENT", birthYear: 2014, describe: "Atlet i Børne-gruppen (12 år), ungdomskontingent" },
  { key: "proeve", name: "Pia Prøve", role: "ATHLETE", group: "BREDDE", gender: "FEMALE", birthYear: 2001, membership: "ADULT", source: "TRIAL", describe: "Ny i klubben med godkendt 14 dages prøveperiode" },
  { key: "kode", name: "Karl Kode", role: "ATHLETE", group: "BREDDE", gender: "MALE", birthYear: 1993, membership: "ADULT", source: "CODE", describe: "Fik adgang med en engangskode fra klubben" },
  { key: "ansoeger", name: "Asta Ansøger", role: "ATHLETE", group: null, membership: null, trial: "PENDING", describe: "Har søgt om prøveperiode – afventer godkendelse fra admin" },
  { key: "udloebet", name: "Ulla Udløbet", role: "ATHLETE", group: "BREDDE", gender: "FEMALE", birthYear: 1972, membership: "ADULT", source: "PAYMENT", expired: true, describe: "Medlemskabet er udløbet – kan se sine data, men ikke tilmelde sig" },
  { key: "ny", name: "Niels Ny", role: "ATHLETE", group: null, membership: null, describe: "Har lige oprettet sig – ingen adgang til tilmelding endnu" },
];

export const demoEmail = (key: string) => `${key}@${DEMO_DOMAIN}`;
export const isDemoEmail = (email: string) => email.toLowerCase().endsWith(`@${DEMO_DOMAIN}`);
