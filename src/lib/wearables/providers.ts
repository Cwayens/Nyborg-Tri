import type { Provider } from "@prisma/client";

// Oversigt over ure og apps. Strava er bygget; de andre kræver partneraftale/API-nøgle hos udbyderen.
export type ProviderInfo = {
  id: Provider;
  name: string;
  status: "live" | "planned";
  note: string;
  envKeys: string[];
};

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "STRAVA",
    name: "Strava",
    status: "live",
    note: "Henter dine aktiviteter automatisk. Virker også med Garmin, Wahoo, Coros, Suunto, Polar, Apple Watch og Zwift, hvis de synkroniserer til Strava.",
    envKeys: ["STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET"],
  },
  { id: "GARMIN", name: "Garmin Connect", status: "planned", note: "Direkte forbindelse kræver godkendelse i Garmins Connect Developer Program.", envKeys: [] },
  { id: "TRAININGPEAKS", name: "TrainingPeaks", status: "planned", note: "Planlagte træninger og matchning med andre medlemmer. Kræver partneradgang hos TrainingPeaks.", envKeys: [] },
  { id: "POLAR", name: "Polar", status: "planned", note: "Polar AccessLink API – kan bygges, når klubben har registreret en app hos Polar.", envKeys: [] },
  { id: "WAHOO", name: "Wahoo", status: "planned", note: "Wahoo Cloud API – kræver godkendt udviklerkonto.", envKeys: [] },
  { id: "COROS", name: "Coros", status: "planned", note: "Coros API – kræver partneraftale.", envKeys: [] },
  { id: "SUUNTO", name: "Suunto", status: "planned", note: "Suunto API Zone – kræver partneraftale.", envKeys: [] },
];

export function providerConfigured(p: ProviderInfo): boolean {
  return p.status === "live" && p.envKeys.every((k) => !!process.env[k]);
}
