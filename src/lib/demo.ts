// Testbrugere til gennemgang af siden. Kun aktive når DEMO_MODE=1.
import type { AthleteGroup, Role } from "@prisma/client";

export const DEMO_DOMAIN = "demo.nyborgtri.dk";

export const demoEnabled = () => process.env.DEMO_MODE === "1";

export type DemoUser = {
  key: string; name: string; role: Role; group: AthleteGroup | null; describe: string;
  membership: "ADULT" | "YOUTH" | null; source?: "PAYMENT" | "TRIAL" | "CODE"; trial?: "PENDING"; shares?: boolean; birthYear?: number;
};

export const DEMO_USERS: DemoUser[] = [
  { key: "admin", name: "Anne Admin", role: "ADMIN", group: "ELITE", membership: "ADULT", source: "PAYMENT", shares: true, describe: "Bestyrelse: medlemmer, betalinger, prøveperioder, koder og indhold" },
  { key: "traener", name: "Thomas Træner", role: "TRAINER", group: "BREDDE", membership: "ADULT", source: "PAYMENT", shares: true, describe: "Træner: opretter og aflyser træninger, ser deltagere" },
  { key: "elite", name: "Emil Elite", role: "ATHLETE", group: "ELITE", membership: "ADULT", source: "PAYMENT", shares: true, describe: "Atlet i Elite-gruppen, betalt medlem med træningsdata" },
  { key: "bredde", name: "Berit Bredde", role: "ATHLETE", group: "BREDDE", membership: "ADULT", source: "PAYMENT", shares: true, describe: "Atlet i Bredde-gruppen, betalt medlem med træningsdata" },
  { key: "boern", name: "Bo Barn", role: "ATHLETE", group: "BOERN", membership: "YOUTH", source: "PAYMENT", birthYear: 2014, describe: "Atlet i Børne-gruppen (12 år), ungdomskontingent" },
  { key: "proeve", name: "Pia Prøve", role: "ATHLETE", group: "BREDDE", membership: "ADULT", source: "TRIAL", describe: "Ny i klubben med godkendt 14 dages prøveperiode" },
  { key: "kode", name: "Karl Kode", role: "ATHLETE", group: "BREDDE", membership: "ADULT", source: "CODE", describe: "Fik adgang med en engangskode fra klubben" },
  { key: "ansoeger", name: "Asta Ansøger", role: "ATHLETE", group: null, membership: null, trial: "PENDING", describe: "Har søgt om prøveperiode – afventer godkendelse fra admin" },
  { key: "ny", name: "Niels Ny", role: "ATHLETE", group: null, membership: null, describe: "Har lige oprettet sig – ingen adgang til tilmelding endnu" },
];

export const demoEmail = (key: string) => `${key}@${DEMO_DOMAIN}`;
export const isDemoEmail = (email: string) => email.toLowerCase().endsWith(`@${DEMO_DOMAIN}`);
