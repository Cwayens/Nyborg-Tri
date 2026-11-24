import type { Discipline } from "@prisma/client";

// "Fra 0 til første triatlon": 10 uger mod en sprint (750 m svøm, 20 km cykel, 5 km løb).
// Programmerne er i tekstformatet fra src/lib/workout.ts, i procent af atletens egne tal:
// cykel af FTP, løb af tærskelfart, svøm af 100 m-fart. "pause" på løb betyder gå.

export type PlanSession = { id: string; discipline: Discipline; title: string; program: string; note?: string };
export type PlanWeek = { week: number; theme: string; tip: string; sessions: PlanSession[] };

const w = (week: number, theme: string, tip: string, sessions: Omit<PlanSession, "id">[]): PlanWeek => ({
  week, theme, tip, sessions: sessions.map((s, i) => ({ ...s, id: `u${week}-${i + 1}` })),
});

export const BEGINNER_PLAN: PlanWeek[] = [
  w(1, "Kom i gang", "Det vigtigste i de første uger er at komme afsted. Det skal føles let, du skal kunne snakke undervejs.", [
    { discipline: "SWIM", title: "Lær vandet at kende", program: "200m 75% opvarmning\n6x50m 80% 30s pause\n100m 70% nedkøling", note: "Hold pause ved kanten så længe du har brug for." },
    { discipline: "BIKE", title: "Rolig cykeltur", program: "10min 55% opvarmning\n25min 65%\n5min 50% nedkøling" },
    { discipline: "RUN", title: "Løb og gå", program: "5min 60% opvarmning\n6x(2min 78%, 1min pause)\n5min 60% nedkøling", note: "Pauserne er gang." },
  ]),
  w(2, "Rytme", "Læg træningerne fast i kalenderen, fx svøm tirsdag, cykel torsdag og løb søndag.", [
    { discipline: "SWIM", title: "Længere stykker", program: "200m 75% opvarmning\n6x75m 80% 30s pause\n100m 70% nedkøling" },
    { discipline: "BIKE", title: "Rolig med lidt fart", program: "10min 55% opvarmning\n3x(5min 80%, 5min 60%)\n5min 50% nedkøling" },
    { discipline: "RUN", title: "Løb og gå", program: "5min 60% opvarmning\n5x(3min 78%, 1min pause)\n5min 60% nedkøling" },
  ]),
  w(3, "Lidt længere", "Spis lidt 1-2 timer før træning og drik vand undervejs på cyklen.", [
    { discipline: "SWIM", title: "100 m ad gangen", program: "200m 75% opvarmning\n5x100m 80% 30s pause\n100m 70% nedkøling" },
    { discipline: "BIKE", title: "Længere tur", program: "10min 55% opvarmning\n40min 65%\n5min 50% nedkøling" },
    { discipline: "RUN", title: "Længere løbestykker", program: "5min 60% opvarmning\n4x(5min 78%, 1min pause)\n5min 60% nedkøling" },
  ]),
  w(4, "Restitution", "En let uge giver kroppen tid til at blive stærkere. Træn kortere og roligere.", [
    { discipline: "SWIM", title: "Let teknik", program: "200m 75% opvarmning\n8x50m 80% 20s pause\n100m 70% nedkøling", note: "Fokus på lange tag og rolig udånding i vandet." },
    { discipline: "BIKE", title: "Let tur", program: "30min 62%" },
    { discipline: "RUN", title: "Let løb", program: "5min 60% opvarmning\n3x(5min 76%, 1min pause)\n5min 60% nedkøling" },
  ]),
  w(5, "Mere udholdenhed", "Prøv at hoppe med på en klubtræning eller en tur under Træn sammen i denne uge.", [
    { discipline: "SWIM", title: "200 m uden stop", program: "200m 75% opvarmning\n3x200m 80% 45s pause\n100m 70% nedkøling" },
    { discipline: "BIKE", title: "Tempo", program: "10min 55% opvarmning\n3x(8min 82%, 4min 60%)\n5min 50% nedkøling" },
    { discipline: "RUN", title: "20 minutter i træk", program: "5min 60% opvarmning\n20min 78%\n5min 60% nedkøling" },
  ]),
  w(6, "Første skiftetræning", "Skiftetræning vænner benene til at løbe efter cykling. Det føles mærkeligt de første minutter, og det er normalt.", [
    { discipline: "SWIM", title: "Længere svøm", program: "200m 75% opvarmning\n2x300m 80% 60s pause\n100m 70% nedkøling" },
    { discipline: "BIKE", title: "Cykel + løb (skift)", program: "10min 55% opvarmning\n30min 70%", note: "Løb 10 min roligt lige efter turen. Læg skoene klar." },
    { discipline: "RUN", title: "Løb med fart", program: "5min 60% opvarmning\n4x(3min 85%, 2min 70%)\n5min 60% nedkøling" },
  ]),
  w(7, "Byg videre", "Svøm i åbent vand med andre, hvis sæsonen tillader det. Aldrig alene.", [
    { discipline: "SWIM", title: "Næsten distancen", program: "200m 75% opvarmning\n500m 80%\n4x50m 85% 20s pause\n100m 70% nedkøling" },
    { discipline: "BIKE", title: "Lang tur", program: "10min 55% opvarmning\n50min 68%\n5min 50% nedkøling" },
    { discipline: "RUN", title: "Langtur", program: "5min 60% opvarmning\n30min 78%\n5min 60% nedkøling" },
  ]),
  w(8, "Restitution og test", "Kør en 5 km-test eller hop med på en testdag, så kan du se, hvor langt du er nået.", [
    { discipline: "SWIM", title: "Let svøm", program: "200m 75% opvarmning\n6x75m 80% 20s pause\n100m 70% nedkøling" },
    { discipline: "BIKE", title: "Let tur", program: "35min 62%" },
    { discipline: "RUN", title: "5 km-test", program: "10min 60% opvarmning\n5km 95%\n5min 60% nedkøling", note: "Løb 5 km så hurtigt du kan holde det hele vejen. Gem resultatet under Mine tests." },
  ]),
  w(9, "Generalprøve", "Prøv dit stævneudstyr og din mad, så der ikke er overraskelser på dagen.", [
    { discipline: "SWIM", title: "Hele distancen", program: "200m 75% opvarmning\n750m 82%\n100m 70% nedkøling" },
    { discipline: "BIKE", title: "Cykel + løb (generalprøve)", program: "10min 55% opvarmning\n40min 75%", note: "Løb 15 min lige efter. Øv skiftet: hjelm af efter cyklen er stillet." },
    { discipline: "RUN", title: "Rolig langtur", program: "5min 60% opvarmning\n35min 76%\n5min 60% nedkøling" },
  ]),
  w(10, "Stævneuge", "Træn kort og let, sov godt og glæd dig. Du har gjort arbejdet.", [
    { discipline: "SWIM", title: "Kort og let", program: "200m 75% opvarmning\n4x50m 85% 30s pause\n100m 70% nedkøling" },
    { discipline: "BIKE", title: "Ben i gang", program: "10min 55% opvarmning\n3x(2min 85%, 3min 60%)\n5min 50% nedkøling" },
    { discipline: "RUN", title: "Dagen før", program: "10min 65%\n3x(20s 100%, 40s pause)", note: "Kort og let. I morgen er det stævne!" },
  ]),
];

export const PLAN_SESSIONS = BEGINNER_PLAN.flatMap((w) => w.sessions);

export const RACE_CHECKLIST = [
  { id: "tilmeldt", text: "Tilmeld dig et stævne (fx NyborgTri Cup) og læs stævneinformationen" },
  { id: "dtf", text: "Løs DTF-licens eller endagslicens" },
  { id: "dragt", text: "Våddragt eller trisuit, svømmebriller og badehætte" },
  { id: "cykel", text: "Cykel tjekket: dæk, bremser og gear. Hjelm (påkrævet)" },
  { id: "nummer", text: "Startnummerbælte, så du ikke skal sætte nummeret på med nåle" },
  { id: "sko", text: "Elastiske snørebånd i løbeskoene sparer tid i skiftet" },
  { id: "mad", text: "Mad og drikke du har prøvet under træning" },
  { id: "skifte", text: "Læg tingene i skiftezonen i den rækkefølge, du skal bruge dem" },
  { id: "rute", text: "Kig ruterne igennem, og find ind- og udgang i skiftezonen" },
  { id: "nyd", text: "Smil på målstregen. Du er triatlet!" },
];
