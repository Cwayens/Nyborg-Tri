/**
 * Opretter testbrugere og eksempeldata til gennemgang af siden.
 * Køres automatisk ved build, når DEMO_MODE=1. Kan køres igen – data genskabes.
 *   DEMO_MODE=1 npx tsx scripts/seed-demo.ts
 */
import { PrismaClient, type AthleteGroup, type Discipline } from "@prisma/client";
import { DEMO_USERS, demoEmail } from "../src/lib/demo";
import { addWeeksLocal, parseLocal } from "../src/lib/time";

const prisma = new PrismaClient();
const DAY = 24 * 3600 * 1000;

function localDate(offsetDays: number): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" }).format(new Date(Date.now() + offsetDays * DAY));
}

// Faste ugentlige træninger (ugedag: 1=man … 7=søn)
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
      const start = new Date(Date.now() - (d.source === "TRIAL" ? 3 : 200) * DAY);
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

  // Træninger 3 uger frem
  const created: { id: string; group: AthleteGroup; startsAt: Date }[] = [];
  for (let offset = 0; offset < 21; offset++) {
    const date = localDate(offset);
    const weekday = ((new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7) + 1;
    for (const w of WEEKLY.filter((x) => x.day === weekday)) {
      const startsAt = parseLocal(`${date}T${w.start}`);
      if (startsAt < new Date()) continue;
      const t = await prisma.trainingSession.create({
        data: { title: w.title, discipline: w.d, group: w.group, location: w.location, startsAt, endsAt: parseLocal(`${date}T${w.end}`), createdById: coach },
      });
      created.push({ id: t.id, group: w.group, startsAt });
    }
  }
  // Én aflyst træning, så man kan se hvordan det ser ud
  const toCancel = created.find((t) => t.group === "BREDDE" && t.startsAt.getTime() > Date.now() + 2 * DAY);
  if (toCancel) await prisma.trainingSession.update({ where: { id: toCancel.id }, data: { cancelledAt: new Date(), cancelReason: "Svømmehallen er lukket pga. stævne" } });

  // Tilmeldinger
  const members = DEMO_USERS.filter((d) => d.membership);
  for (const t of created.slice(0, 14)) {
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

  // Testresultater: fire tests over et år med fremgang
  const ids2 = Object.values(users).map((u) => u.id);
  await prisma.benchmarkResult.deleteMany({ where: { userId: { in: ids2 } } });
  const BENCH: Record<string, Partial<Record<"RUN_5K" | "RUN_10K" | "BIKE_FTP20" | "SWIM_100" | "SWIM_1500", number>>> = {
    elite: { RUN_5K: 1140, RUN_10K: 2400, BIKE_FTP20: 320, SWIM_100: 72, SWIM_1500: 1260 },
    admin: { RUN_5K: 1260, RUN_10K: 2640, BIKE_FTP20: 260, SWIM_100: 88, SWIM_1500: 1500 },
    traener: { RUN_5K: 1330, RUN_10K: 2790, BIKE_FTP20: 240, SWIM_100: 95 },
    bredde: { RUN_5K: 1620, RUN_10K: 3420, BIKE_FTP20: 185, SWIM_100: 128, SWIM_1500: 2160 },
    boern: { RUN_5K: 1500, SWIM_100: 110 },
    kode: { RUN_5K: 1700 },
  };
  for (const [key, tests] of Object.entries(BENCH)) {
    for (const [test, base] of Object.entries(tests)) {
      const watts = test === "BIKE_FTP20";
      // Fire tests med 3 måneders mellemrum; ældste er svagest
      for (let i = 0; i < 4; i++) {
        const factor = 1 + (3 - i) * 0.025 + (i === 2 ? 0.008 : 0);
        const v = watts ? Math.round(base / factor) : Math.round(base * factor);
        await prisma.benchmarkResult.create({
          data: {
            userId: users[key].id, test: test as never, date: parseLocal(`${localDate(-(3 - i) * 90 - 5)}T12:00`),
            seconds: watts ? null : v, watts: watts ? v : null, note: i === 3 ? "Klubtest" : null,
          },
        });
      }
    }
  }

  // Gruppechat
  await prisma.chatMessage.deleteMany({ where: { userId: { in: ids2 } } });
  const CHAT: [string, AthleteGroup, "RUN" | "BIKE" | "SWIM", string, number][] = [
    ["traener", "BREDDE", "RUN", "Husk lørdagsløb på Volden kl. 9. Vi deler op i to tempohold, så alle kan være med.", 26],
    ["bredde", "BREDDE", "RUN", "Jeg kommer! Er der nogen, der vil tage en rolig tur bagefter?", 25],
    ["kode", "BREDDE", "RUN", "Jeg er med på den rolige tur 🙌", 24],
    ["proeve", "BREDDE", "SWIM", "Første gang i svømmehallen på torsdag. Skal jeg have noget særligt med?", 8],
    ["traener", "BREDDE", "SWIM", "Velkommen Pia! Badehætte og svømmebriller. Vi har plader og pullbuoys.", 7],
    ["bredde", "BREDDE", "BIKE", "Langtur søndag: 70 km i roligt tempo. Vi venter på hinanden ved bakkerne.", 30],
    ["elite", "ELITE", "BIKE", "Hvem tager med på 4x10 min ved FTP i morgen tidlig?", 20],
    ["admin", "ELITE", "BIKE", "Med! Mødes ved idrætscentret 6:30.", 19],
    ["elite", "ELITE", "RUN", "Ny PR på 5 km til klubtesten 🎉", 50],
    ["boern", "BOERN", "SWIM", "Jeg kunne svømme 100 m crawl uden at stoppe!", 12],
  ];
  for (const [key, group, channel, body, hoursAgo] of CHAT) {
    await prisma.chatMessage.create({ data: { userId: users[key].id, group, channel, body, createdAt: new Date(Date.now() - hoursAgo * 3600 * 1000) } });
  }

  console.log(`Demodata oprettet: ${DEMO_USERS.length} testbrugere, ${created.length} træninger`);
}

main().finally(() => prisma.$disconnect());
