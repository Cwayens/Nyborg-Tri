import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "./db";

// Funktioner, som admin kan slå fra under Administration → Funktioner, hvis de bliver for meget.
// Når en funktion er slået fra, forsvinder links og bokse, og siderne svarer 404. Data gemmes, så den kan slås til igen.
export const FEATURE_GROUPS = ["Træning", "Fællesskab", "Bredden", "Offentlig side", "Administration"] as const;
type Def = { label: string; text: string; group: (typeof FEATURE_GROUPS)[number]; href?: string };

export const FEATURES = {
  traensammen: { group: "Træning", href: "/traen-sammen", label: "Træn sammen", text: "Medlemmer slår egne ture op og deler programmer fra TrainingPeaks, så andre kan hoppe med." },
  urfiler: { group: "Træning", label: "Programmer til uret", text: "Knapper til at hente træningsprogrammer som .fit (ur) og .zwo (Zwift)." },
  tests: { group: "Træning", href: "/benchmarks", label: "Mine tests", text: "Testresultater fra uret (5 km, FTP, 100 m m.fl.) og trænernes oversigt over testresultater." },
  statistik: { group: "Træning", href: "/statistik", label: "Statistik", text: "Klubbens og medlemmets træningsstatistik." },
  leaderboard: { group: "Fællesskab", href: "/leaderboard", label: "Leaderboard", text: "Frivillig rangliste med årets bedste præstationer og mest fremgang." },
  chat: { group: "Fællesskab", href: "/chat", label: "Chat", text: "Gruppechat for holdene og hele klubben." },
  tempo: { group: "Bredden", label: "Tempogrupper", text: "Trænere kan dele en klubtræning i tempogrupper, og man vælger gruppe ved tilmelding." },
  makker: { group: "Bredden", href: "/makker", label: "Find en makker", text: "Medlemmer udfylder en makkerprofil og finder andre på samme niveau og tidspunkt." },
  begynder: { group: "Bredden", href: "/begynder", label: "Begynderforløb", text: "10 uger \"Fra 0 til første triatlon\" med programmer til uret og en stævnetjekliste." },
  mentor: { group: "Bredden", href: "/mentor", label: "Mentorordning", text: "Erfarne medlemmer melder sig som mentor, og nye kan få tildelt en." },
  tips: { group: "Bredden", href: "/tips", label: "Ugens tip", text: "Trænere lægger korte tips og videoer ud om teknik og træning." },
  testdage: { group: "Bredden", label: "Testdage", text: "Trænere markerer klubtræninger som testdag, og medlemmer ser deres fremgang som graf." },
  udfordringer: { group: "Bredden", href: "/udfordringer", label: "Klubudfordringer", text: "Fælles månedsmål for klubben med mærker for at være med." },
  staevner: { group: "Bredden", href: "/staevner", label: "Stævner og samkørsel", text: "Hvem skal til hvilke stævner, samkørsel og klubtelt." },
  atleter: { group: "Offentlig side", href: "/atleter", label: "Atleter", text: "Offentlige profiler af klubbens atleter (kun med samtykke)." },
  sponsorer: { group: "Offentlig side", href: "/sponsorer", label: "Sponsorer", text: "Sponsorside og sponsorbjælken på forsiden." },
  ruter: { group: "Offentlig side", href: "/ruter", label: "Ruter og kort", text: "Kort med klubbens træningssteder og ruter, som kan hentes som GPX." },
  mail: { group: "Administration", href: "/admin/mail", label: "Mail til hold og medlemmer", text: "Trænere og admin kan sende mail til hold, prøvetrænende eller alle medlemmer." },
} as const satisfies Record<string, Def>;

export type Feature = keyof typeof FEATURES;
export const FEATURE_KEYS = Object.keys(FEATURES) as Feature[];

const KEY = "features_off";

/** Slåede-fra funktioner. Hentes én gang pr. forespørgsel. */
export const featuresOff = cache(async (): Promise<Set<Feature>> => {
  const row = await prisma.setting.findUnique({ where: { key: KEY } }).catch(() => null);
  return new Set(Array.isArray(row?.value) ? (row!.value as Feature[]) : []);
});

export async function isOn(f: Feature): Promise<boolean> {
  return !(await featuresOff()).has(f);
}

/** Links (href) der skal skjules, fordi funktionen er slået fra. */
export async function hiddenHrefs(): Promise<string[]> {
  const off = await featuresOff();
  return FEATURE_KEYS.filter((k) => off.has(k)).map((k) => (FEATURES[k] as Def).href).filter((h): h is string => !!h);
}

/** Sider for en slået-fra funktion svarer 404. */
export async function requireFeature(f: Feature): Promise<void> {
  if (!(await isOn(f))) notFound();
}

export async function setFeaturesOff(off: Feature[]): Promise<void> {
  await prisma.setting.upsert({ where: { key: KEY }, update: { value: off }, create: { key: KEY, value: off } });
}
