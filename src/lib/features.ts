import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "./db";

// Funktioner til bredden, som admin kan slå fra under Administration → Funktioner, hvis de bliver for meget.
// Når en funktion er slået fra, forsvinder links og bokse, og siderne svarer 404. Data gemmes, så den kan slås til igen.
export const FEATURES = {
  tempo: { label: "Tempogrupper", text: "Trænere kan dele en klubtræning i tempogrupper, og man vælger gruppe ved tilmelding." },
  makker: { label: "Find en makker", text: "Medlemmer udfylder en makkerprofil og finder andre på samme niveau og tidspunkt." },
  begynder: { label: "Begynderforløb", text: "10 uger \"Fra 0 til første triatlon\" med programmer til uret og en stævnetjekliste." },
  mentor: { label: "Mentorordning", text: "Erfarne medlemmer melder sig som mentor, og nye kan få tildelt en." },
  tips: { label: "Ugens tip", text: "Trænere lægger korte tips og videoer ud om teknik og træning." },
  testdage: { label: "Testdage", text: "Trænere markerer klubtræninger som testdag, og medlemmer ser deres fremgang som graf." },
  udfordringer: { label: "Klubudfordringer", text: "Fælles månedsmål for klubben med mærker for at være med." },
  staevner: { label: "Stævner og samkørsel", text: "Hvem skal til hvilke stævner, samkørsel og klubtelt." },
} as const;

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

/** Sider for en slået-fra funktion svarer 404. */
export async function requireFeature(f: Feature): Promise<void> {
  if (!(await isOn(f))) notFound();
}

export async function setFeaturesOff(off: Feature[]): Promise<void> {
  await prisma.setting.upsert({ where: { key: KEY }, update: { value: off }, create: { key: KEY, value: off } });
}
