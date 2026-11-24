import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Kontingentsatser fra nyborgtri.dk/bliv-medlem (nov. 2026)
const membershipTypes = [
  { code: "ADULT", name: "Voksen", priceOre: 100000, sortOrder: 1, description: "Fuldt medlemskab, 18 år og op" },
  { code: "YOUTH", name: "Ung under 18 år", priceOre: 50000, sortOrder: 2, description: "Fuldt medlemskab for unge under 18 år" },
  { code: "PASSIVE", name: "Passiv", priceOre: 20000, sortOrder: 3, description: "Støttemedlem uden træning" },
];

async function main() {
  for (const t of membershipTypes) {
    await prisma.membershipType.upsert({ where: { code: t.code }, update: t, create: t });
  }

  // ADMIN_EMAIL (eller ADMIN_EMAILS) kan indeholde flere adresser adskilt af komma
  const adminEmails = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  for (const email of adminEmails) {
    await prisma.user.upsert({ where: { email }, update: { role: "ADMIN" }, create: { email, role: "ADMIN" } });
    console.log(`Administrator: ${email}`);
  }

  // Ny "Bliv medlem"-tekst – den gamle henviste til Klubmodul
  await prisma.page.upsert({
    where: { path: "bliv-medlem" },
    update: {},
    create: {
      path: "bliv-medlem",
      title: "Bliv medlem",
      body: [
        "Der er plads til alle i Nyborg Triathlon Klub, unge og gamle, begyndere og erfarne triatleter.",
        "",
        "Du er velkommen til at komme og være med til nogle af vores træninger, inden du melder dig ind.",
        "",
        "Medlemskabet gælder 1 år fra indmeldelsesdatoen og kan fornyes. Medlemskab af Nyborg Triathlon Klub giver også automatisk medlemskab af Triathlon Danmark.",
      ].join("\n"),
    },
  });

  // Sponsorer fra den gamle side. Oprettes kun første gang; derefter styrer admin dem.
  if ((await prisma.sponsor.count()) === 0) {
    const sponsors = [
      ["Erik Jørgensen's Eftf.", null, "erik-joergensen"],
      ["Intersport Nyborg", "https://intersport.dk", "intersport"],
      ["TilNyborg.dk", "http://www.tilnyborg.dk/", "tilnyborg"],
      ["Fri BikeShop", "https://www.fribikeshop.dk/", "fri-bike-shop"],
      ["TYR", "http://tyrdanmark.dk/", "tyr"],
      ["Løbexperten", "http://www.loebexperten.dk/", "loebeexperten"],
      ["FIT 4 RUN", "http://www.fit4run.dk/", "fit4run"],
    ] as const;
    for (const [i, [name, url, file]] of sponsors.entries()) {
      await prisma.sponsor.create({ data: { name, url, logo: `/sponsorer/${file}.webp`, sortOrder: i } });
    }
  }

  console.log("Seed færdig");
}

main().finally(() => prisma.$disconnect());
