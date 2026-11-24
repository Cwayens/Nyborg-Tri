/**
 * Opretter testbrugere og eksempeldata til gennemgang af siden.
 * Køres automatisk ved build, når DEMO_MODE=1. Kan køres igen – data genskabes.
 *   DEMO_MODE=1 npx tsx scripts/seed-demo.ts
 */
import { PrismaClient, type AthleteGroup, type Discipline } from "@prisma/client";
import { DEMO_USERS, demoEmail } from "../src/lib/demo";
import { addWeeksLocal, parseLocal } from "../src/lib/time";
import { parseText } from "../src/lib/workout";

const prisma = new PrismaClient();
const DAY = 24 * 3600 * 1000;

function localDate(offsetDays: number): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" }).format(new Date(Date.now() + offsetDays * DAY));
}

// Faste ugentlige træninger (ugedag: 1=man … 7=søn)
// Programmer som trænerne har lagt ind (samme format som ved import fra TrainingPeaks)
const PROGRAMS: Record<string, string> = {
  "Morgensvøm – intervaller": "400m 70% opvarmning\n8x(100m 105%, 20s pause)\n4x(200m 95%, 30s pause)\n200m 60% nedkøling",
  "Intervalløb på banen": "15min 70-80% opvarmning\n6x(1000m 104%, 90s pause)\n10min 65% nedkøling",
  "Elite-cykling i tempo": "20min 55-75% opvarmning\n3x(15min 90-95%, 5min 55%)\n15min 50% nedkøling",
  "Langtur på racercykel": "150min 60-70%",
  "Svømning med træner": "300m 70% opvarmning\n10x(50m 100%, 15s pause)\n6x(100m 90%, 20s pause)\n200m 60% nedkøling",
};

const WEEKLY: { day: number; start: string; end: string; title: string; d: Discipline; group: AthleteGroup; location: string }[] = [
  { day: 1, start: "19:00", end: "20:30", title: "Svømning – teknik", d: "SWIM", group: "BREDDE", location: "Vippebassin bane 1-4" },
  { day: 1, start: "18:00", end: "19:00", title: "Løb med NGIF", d: "RUN", group: "BREDDE", location: "Nyborg Idræts- og Fritidscenter" },
  { day: 3, start: "06:00", end: "07:30", title: "Morgensvøm – intervaller", d: "SWIM", group: "ELITE", location: "Sportsbassin bane 4-5" },
  { day: 3, start: "17:00", end: "18:00", title: "Intervalløb på banen", d: "RUN", group: "ELITE", location: "Idrætsparken" },
  { day: 4, start: "20:00", end: "21:30", title: "Svømning med træner", d: "SWIM", group: "BREDDE", location: "Sportsbassin bane 4-6" },
  { day: 6, start: "09:00", end: "10:00", title: "Børnesvømning", d: "SWIM", group: "BOERN", location: "Vippebassin bane 1-2" },
  { day: 6, start: "10:15", end: "11:00", title: "Børneløb og leg", d: "RUN", group: "BOERN", location: "Nyborg Vold" },
  { day: 7, start: "09:30", end: "12:00", title: "Langtur på racercykel", d: "BIKE", group: "BREDDE", location: "P-pladsen ved idrætscentret" },
  { day: 7, start: "09:30", end: "12:30", title: "Elite-cykling i tempo", d: "BIKE", group: "ELITE", location: "P-pladsen ved idrætscentret" },
];

async function main() {
  const types = Object.fromEntries((await prisma.membershipType.findMany()).map((t) => [t.code, t]));
  if (!types.ADULT) throw new Error("Kør prisma/seed.ts først (medlemstyper mangler)");

  // Ryd tidligere demodata
  const old = await prisma.user.findMany({ where: { email: { endsWith: "@demo.nyborgtri.dk" } }, select: { id: true } });
  const ids = old.map((u) => u.id);
  await prisma.trainingSession.deleteMany({ where: { createdById: { in: ids } } });
  await prisma.accessCode.deleteMany({ where: { OR: [{ createdById: { in: ids } }, { usedById: { in: ids } }] } });
  await prisma.payment.deleteMany({ where: { userId: { in: ids } } });
  await prisma.membership.deleteMany({ where: { userId: { in: ids } } });
  await prisma.trialRequest.deleteMany({ where: { userId: { in: ids } } });
  await prisma.trialRequest.updateMany({ where: { decidedById: { in: ids } }, data: { decidedById: null } });

  if (process.argv.includes("--slet")) {
    // Fjern testbrugerne helt (sessions, aktiviteter, tilmeldinger m.m. slettes via cascade)
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    console.log(`Testdata slettet: ${ids.length} testbrugere`);
    return;
  }

  const users: Record<string, { id: string }> = {};
  for (const d of DEMO_USERS) {
    const data = {
      name: d.name, role: d.role, athleteGroup: d.group, shareActivities: !!d.shares, phone: "20 30 40 50",
      birthDate: d.birthYear ? new Date(`${d.birthYear}-05-10`) : new Date("1988-03-14"),
      gender: d.gender ?? null,
      // Børn under 18 har en forælder/værge, som får betalingslinket
      guardianName: d.group === "BOERN" ? "Birgitte Barn" : null,
      guardianEmail: d.group === "BOERN" ? `foraelder-${d.key}@demo.nyborgtri.dk` : null,
      // Leaderboard er frivilligt; de fleste testbrugere er med, så siden har indhold
      leaderboard: !!d.gender && d.group !== "BOERN" && d.key !== "proeve",
    };
    users[d.key] = await prisma.user.upsert({ where: { email: demoEmail(d.key) }, update: data, create: { email: demoEmail(d.key), ...data } });
  }
  const admin = users.admin.id;
  const coach = users.traener.id;

  for (const d of DEMO_USERS) {
    const uid = users[d.key].id;
    if (d.membership) {
      const type = types[d.membership];
      const days = d.source === "TRIAL" ? 14 : 365;
      const start = new Date(Date.now() - (d.expired ? 380 : d.source === "TRIAL" ? 3 : 200) * DAY);
      const m = await prisma.membership.create({ data: { userId: uid, typeId: type.id, source: d.source ?? "PAYMENT", startDate: start, endDate: new Date(start.getTime() + days * DAY) } });
      if (d.source === "PAYMENT") {
        await prisma.payment.create({ data: { userId: uid, membershipId: m.id, amountOre: type.priceOre, description: `Kontingent ${type.name}`, status: "PAID", paidAt: start, accountingStatus: "SKIPPED" } });
      }
      if (d.source === "TRIAL") await prisma.trialRequest.create({ data: { userId: uid, status: "APPROVED", decidedAt: start, decidedById: admin, message: "Har løbet i nogle år og vil gerne prøve triatlon" } });
      if (d.source === "CODE") await prisma.accessCode.create({ data: { code: "NT-DEMO-BRUG", typeId: type.id, days: 365, note: "Demo: allerede brugt", createdById: admin, usedById: uid, usedAt: start } });
    }
    if (d.trial === "PENDING") await prisma.trialRequest.create({ data: { userId: uid, message: "Jeg vil gerne prøve svømmetræningen" } });
  }
  // Ubrugte koder man kan afprøve
  for (const code of ["NT-TEST-0001", "NT-TEST-0002", "NT-TEST-0003"]) {
    await prisma.accessCode.create({ data: { code, typeId: types.ADULT.id, days: 365, note: "Demo: kan bruges", createdById: admin } });
  }

  // Træninger fra 4 uger tilbage til 6 uger frem, så månedskalenderen er fyldt
  const created: { id: string; group: AthleteGroup; startsAt: Date }[] = [];
  for (let offset = -28; offset < 42; offset++) {
    const date = localDate(offset);
    const weekday = ((new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7) + 1;
    for (const w of WEEKLY.filter((x) => x.day === weekday)) {
      const startsAt = parseLocal(`${date}T${w.start}`);
      const t = await prisma.trainingSession.create({
        data: {
          title: w.title, discipline: w.d, group: w.group, location: w.location, startsAt, endsAt: parseLocal(`${date}T${w.end}`), createdById: coach,
          ...(PROGRAMS[w.title] ? { workout: parseText(PROGRAMS[w.title]) as object } : {}),
        },
      });
      created.push({ id: t.id, group: w.group, startsAt });
    }
  }
  // Én aflyst træning, så man kan se hvordan det ser ud
  const toCancel = created.find((t) => t.group === "BREDDE" && t.startsAt.getTime() > Date.now() + 2 * DAY);
  if (toCancel) await prisma.trainingSession.update({ where: { id: toCancel.id }, data: { cancelledAt: new Date(), cancelReason: "Svømmehallen er lukket pga. stævne" } });

  // Tilmeldinger
  const members = DEMO_USERS.filter((d) => d.membership && !d.expired);
  const now0 = Date.now();
  const future = created.filter((t) => t.startsAt.getTime() > now0);
  const past = created.filter((t) => t.startsAt.getTime() <= now0);
  for (const t of [...past.slice(-10), ...future.slice(0, 14)]) {
    if (t.id === toCancel?.id) continue;
    for (const d of members.filter((m) => m.group === t.group && m.key !== "admin")) {
      if ((t.startsAt.getDate() + d.key.length) % 3 === 0) continue;
      await prisma.trainingSignup.create({ data: { sessionId: t.id, userId: users[d.key].id } });
    }
  }

  // Træn sammen
  await prisma.groupWorkout.deleteMany({ where: { hostId: { in: Object.values(users).map((u) => u.id) } } });
  const tours = [
    { host: "bredde", d: "RUN" as Discipline, title: "Rolig søndagsløb 12 km", location: "Nyborg Vold, Eksercerpladsen", day: 2, at: "09:00", min: 75, level: "6:00 /km", join: ["proeve", "kode"] },
    { host: "elite", d: "BIKE" as Discipline, title: "Tempotur til Kerteminde", location: "Rundkørslen ved Hjulby", day: 1, at: "16:30", min: 120, level: "32-34 km/t", join: ["admin"] },
    { host: "traener", d: "SWIM" as Discipline, title: "Ekstra svøm i Storebæltsbadet", location: "Storebæltsbadet", day: 4, at: "07:00", min: 45, level: "Våddragt", join: [] },
  ];
  for (const t of tours) {
    await prisma.groupWorkout.create({
      data: {
        hostId: users[t.host].id, discipline: t.d, title: t.title, location: t.location, startsAt: parseLocal(`${localDate(t.day)}T${t.at}`),
        durationMin: t.min, level: t.level, description: t.host === "bredde" ? "Alle kan være med – vi venter på hinanden." : null,
        participants: { create: [t.host, ...t.join].map((k) => ({ userId: users[k].id })) },
      },
    });
  }

  // Træningsdata de sidste 8 uger (manuelle aktiviteter, så de må vises i klubstatistikken)
  await prisma.activity.deleteMany({ where: { userId: { in: Object.values(users).map((u) => u.id) } } });
  const plan: { d: Discipline; name: string; min: number; dist: number }[] = [
    { d: "SWIM", name: "Svømning", min: 50, dist: 2200 }, { d: "RUN", name: "Løbetur", min: 45, dist: 8500 },
    { d: "BIKE", name: "Cykeltur", min: 95, dist: 48000 }, { d: "RUN", name: "Intervaller", min: 40, dist: 8000 },
    { d: "STRENGTH", name: "Styrketræning", min: 35, dist: 0 }, { d: "BIKE", name: "Zwift", min: 60, dist: 30000 },
  ];
  const level: Record<string, number> = { admin: 1.1, traener: 0.9, elite: 1.5, bredde: 0.8, boern: 0.4, proeve: 0.6, kode: 0.7 };
  for (const [key, f] of Object.entries(level)) {
    for (let day = 1; day <= 56; day++) {
      if ((day * 7 + key.length) % 10 >= Math.round(5 * f) + 2) continue;
      const p = plan[(day + key.length) % plan.length];
      const vary = 0.8 + ((day * 13 + key.length * 7) % 40) / 100;
      await prisma.activity.create({
        data: {
          userId: users[key].id, provider: "MANUAL", sport: p.d, name: p.name,
          startAt: parseLocal(`${localDate(-day)}T${addWeeksLocal("2000-01-01T17:00", 0).slice(11)}`),
          movingSec: Math.round(p.min * 60 * vary * Math.max(f, 0.6)), distanceM: Math.round(p.dist * vary * Math.max(f, 0.6)),
        },
      });
    }
  }

  // Ture fra uret (Strava) med bedste præstationer til Mine tests og leaderboard.
  // Testbrugerne får en forbindelse til Strava med falske nøgler; ingen data hentes rigtigt.
  const ids2 = Object.values(users).map((u) => u.id);
  await prisma.benchmarkResult.deleteMany({ where: { userId: { in: ids2 } } });
  await prisma.wearableConnection.deleteMany({ where: { userId: { in: ids2 } } });

  // Ekstra klubkammerater, kun til leaderboardet (de kan ikke logge ind)
  const MATES: [string, "MALE" | "FEMALE", number, number][] = [
    ["Mads Holm", "MALE", 1999, 1.05], ["Jonas Kjær", "MALE", 1995, 1.18], ["Rasmus Lind", "MALE", 1991, 1.12], ["Søren Bak", "MALE", 1987, 1.25],
    ["Henrik Due", "MALE", 1983, 1.15], ["Kim Vestergaard", "MALE", 1979, 1.3], ["Peter Friis", "MALE", 1976, 1.2], ["Lars Mørk", "MALE", 1970, 1.32],
    ["Jens Bruun", "MALE", 1964, 1.4], ["Ole Skov", "MALE", 1957, 1.5], ["Frederik Ravn", "MALE", 2004, 1.1], ["Anders Bech", "MALE", 1989, 1.38],
    ["Sofie Lund", "FEMALE", 2000, 1.08], ["Ida Krogh", "FEMALE", 1996, 1.2], ["Mette Dahl", "FEMALE", 1992, 1.15], ["Louise Brandt", "FEMALE", 1986, 1.28],
    ["Camilla Juhl", "FEMALE", 1982, 1.18], ["Maria Thorup", "FEMALE", 1978, 1.35], ["Hanne Ebbesen", "FEMALE", 1971, 1.3], ["Lone Winther", "FEMALE", 1966, 1.45],
    ["Karen Iversen", "FEMALE", 1958, 1.55], ["Emma Poulsen", "FEMALE", 2003, 1.22], ["Signe Bonde", "FEMALE", 1988, 1.12], ["Trine Gade", "FEMALE", 1975, 1.4],
  ];
  const mates: { id: string; g: "MALE" | "FEMALE"; f: number; seed: number }[] = [];
  for (const [i, [name, g, by, f]] of MATES.entries()) {
    const email = `klubkammerat-${i + 1}@${"demo.nyborgtri.dk"}`;
    const data = { name, role: "ATHLETE" as const, athleteGroup: (f < 1.2 ? "ELITE" : "BREDDE") as AthleteGroup, gender: g, birthDate: new Date(`${by}-0${(i % 9) + 1}-15`), leaderboard: true };
    const u = await prisma.user.upsert({ where: { email }, update: data, create: { email, ...data } });
    mates.push({ id: u.id, g, f, seed: i + 3 });
  }

  type T = "RUN_5K" | "RUN_10K" | "RUN_HALF" | "BIKE_FTP20" | "BIKE_40K" | "SWIM_100" | "SWIM_1500";
  // Niveau: 1.0 = klubbens bedste. Basis er årets bedste for en mand på niveau 1.0
  const BASE: Record<T, number> = { RUN_5K: 1080, RUN_10K: 2260, RUN_HALF: 5000, BIKE_FTP20: 330, BIKE_40K: 3700, SWIM_100: 70, SWIM_1500: 1200 };
  const SPORT: Record<T, Discipline> = { RUN_5K: "RUN", RUN_10K: "RUN", RUN_HALF: "RUN", BIKE_FTP20: "BIKE", BIKE_40K: "BIKE", SWIM_100: "SWIM", SWIM_1500: "SWIM" };
  const DIST: Record<T, number> = { RUN_5K: 5000, RUN_10K: 10000, RUN_HALF: 21098, BIKE_FTP20: 32000, BIKE_40K: 40000, SWIM_100: 100, SWIM_1500: 1500 };
  const NAMES: Record<T, [string, string]> = {
    RUN_5K: ["Klubtest 5 km", "Tempoløb"], RUN_10K: ["Klubtest 10 km", "Langtur med fart til sidst"], RUN_HALF: ["Halvmaraton", "Langtur"],
    BIKE_FTP20: ["FTP-test", "Intervaller 3x20 min"], BIKE_40K: ["Enkeltstart 40 km", "Fællestur"],
    SWIM_100: ["Testsvøm 100 m", "Intervaller i hallen"], SWIM_1500: ["Testsvøm 1500 m", "Open water i Storebælt"],
  };
  const value = (t: T, g: "MALE" | "FEMALE", f: number) =>
    t === "BIKE_FTP20" ? Math.round(BASE[t] / f / (g === "FEMALE" ? 1.3 : 1)) : Math.round(BASE[t] * f * (g === "FEMALE" ? 1.1 : 1));

  let n = 0;
  async function effortsFor(userId: string, g: "MALE" | "FEMALE", f: number, seed: number, tests: T[], saveTests: boolean) {
    for (const t of tests) {
      const watts = t === "BIKE_FTP20";
      const best = value(t, g, f);
      const lastYear = 1.02 + ((seed * 7 + t.length * 3) % 9) / 100; // 2–10 % fremgang
      // Sidste år (3 ture) og i år (4 ture, bedst til sidst); dagene er bagud fra i dag
      const plan: [number, number, boolean][] = [
        [-640, lastYear * 1.03, false], [-540, lastYear * 1.01, false], [-450, lastYear, true],
        [-300, 1.04, true], [-200, 1.025, true], [-95, 1.01, false], [-25 - (seed % 15), 1, true],
      ];
      for (const [i, [days, factor, isTest]] of plan.entries()) {
        const v = watts ? Math.round(best / factor) : Math.round(best * factor);
        const date = parseLocal(`${localDate(days - (seed % 5))}T${isTest ? "09:30" : "17:15"}`);
        const longer = !isTest && t !== "SWIM_100" ? 1.6 : isTest ? 1 : 12;
        const secs = watts ? 3600 : Math.round(v * longer * 1.04);
        const act = await prisma.activity.create({
          data: {
            userId, provider: "STRAVA", externalId: `demo-${userId}-${n++}`, sport: SPORT[t], name: NAMES[t][isTest ? 0 : 1],
            startAt: date, movingSec: secs, distanceM: Math.round(DIST[t] * (watts ? 1 : longer)), hasPower: watts, effortsAt: new Date(),
          },
        });
        const effort = await prisma.effort.create({
          data: { userId, activityId: act.id, test: t, date, seconds: watts ? null : v, watts: watts ? v : null },
        });
        // Testbrugerne har gemt klubtestene i Mine tests; resten står som forslag
        if (saveTests && isTest && i >= 2 && ["RUN_5K", "RUN_10K", "BIKE_FTP20", "SWIM_100", "SWIM_1500"].includes(t)) {
          await prisma.benchmarkResult.create({
            data: { userId, test: t, date, seconds: effort.seconds, watts: effort.watts, source: "STRAVA", note: act.name, effortId: effort.id },
          });
        }
      }
    }
  }

  const ALL: T[] = ["RUN_5K", "RUN_10K", "RUN_HALF", "BIKE_FTP20", "BIKE_40K", "SWIM_100", "SWIM_1500"];
  const MINE: Record<string, [number, T[]]> = {
    elite: [1.02, ALL],
    admin: [1.12, ALL],
    traener: [1.2, ["RUN_5K", "RUN_10K", "BIKE_FTP20", "SWIM_100"]],
    bredde: [1.38, ["RUN_5K", "RUN_10K", "BIKE_FTP20", "SWIM_100", "SWIM_1500"]],
    kode: [1.45, ["RUN_5K"]],
    udloebet: [1.4, ["RUN_5K", "SWIM_1500"]],
  };
  for (const [key, [f, tests]] of Object.entries(MINE)) {
    const d = DEMO_USERS.find((x) => x.key === key)!;
    await prisma.wearableConnection.create({
      data: { userId: users[key].id, provider: "STRAVA", externalAthleteId: `demo-${key}`, accessToken: "demo", refreshToken: "demo", expiresAt: new Date(Date.now() + 365 * DAY), lastSyncAt: new Date() },
    });
    await effortsFor(users[key].id, d.gender!, f, key.length, tests, true);
  }
  for (const m of mates) {
    await prisma.activity.deleteMany({ where: { userId: m.id } });
    const tests = ALL.filter((_, i) => (m.seed + i) % 3 !== 0 || i === 0);
    await effortsFor(m.id, m.g, m.f, m.seed, tests, false);
  }

  // Gruppechat
  await prisma.chatMessage.deleteMany({ where: { userId: { in: ids2 } } });
  const CHAT: [string, "VOKSNE" | "BOERN", "RUN" | "BIKE" | "SWIM" | "SOCIAL", string, number][] = [
    ["admin", "VOKSNE", "SOCIAL", "Klubaften fredag kl. 19 i klubhuset – vi griller og viser billeder fra sæsonen 🍔", 40],
    ["bredde", "VOKSNE", "SOCIAL", "Jeg tager kartoffelsalat med!", 36],
    ["elite", "VOKSNE", "SOCIAL", "Tak for i dag alle sammen, sikke et vejr til open water 🌊", 3],
    ["traener", "VOKSNE", "RUN", "Husk lørdagsløb på Volden kl. 9. Vi deler op i to tempohold, så alle kan være med.", 26],
    ["bredde", "VOKSNE", "RUN", "Jeg kommer! Er der nogen, der vil tage en rolig tur bagefter?", 25],
    ["kode", "VOKSNE", "RUN", "Jeg er med på den rolige tur 🙌", 24],
    ["proeve", "VOKSNE", "SWIM", "Første gang i svømmehallen på torsdag. Skal jeg have noget særligt med?", 8],
    ["traener", "VOKSNE", "SWIM", "Velkommen Pia! Badehætte og svømmebriller. Vi har plader og pullbuoys.", 7],
    ["bredde", "VOKSNE", "BIKE", "Langtur søndag: 70 km i roligt tempo. Vi venter på hinanden ved bakkerne.", 30],
    ["elite", "VOKSNE", "BIKE", "Hvem tager med på 4x10 min ved FTP i morgen tidlig?", 20],
    ["admin", "VOKSNE", "BIKE", "Med! Mødes ved idrætscentret 6:30.", 19],
    ["elite", "VOKSNE", "RUN", "Ny PR på 5 km til klubtesten 🎉", 50],
    ["boern", "BOERN", "SWIM", "Jeg kunne svømme 100 m crawl uden at stoppe!", 12],
    ["boern", "BOERN", "SOCIAL", "Hvem kommer til MiniTri til sommer? 🏊‍♂️🚲🏃", 6],
  ];
  for (const [key, room, channel, body, hoursAgo] of CHAT) {
    await prisma.chatMessage.create({ data: { userId: users[key].id, room, channel, body, createdAt: new Date(Date.now() - hoursAgo * 3600 * 1000) } });
  }

  console.log(`Demodata oprettet: ${DEMO_USERS.length} testbrugere, ${created.length} træninger`);
}

main().finally(() => prisma.$disconnect());
