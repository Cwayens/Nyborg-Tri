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

  // Tekster fra den gamle sponsorside. Udfyldes kun, hvis admin ikke selv har skrevet noget.
  const info: [string, string, string | null, string | null][] = [
    ["Erik Jørgensen's Eftf.", "Kran- og containerservice i Nyborg siden 1966.", null, "Tlf. 65 31 25 52"],
    ["Intersport Nyborg", "Sportsbutik i Nyborg med løb, cykel og svøm.", "10 % rabat på alle varer", "Korsgade 4, 5800 Nyborg\nTlf. 26 12 15 98 · nyborg@intersport.dk\nRabatten gives kontant i butikken. Vis at du er medlem."],
    ["TilNyborg.dk", "Alt om at bo, handle og opleve i Nyborg.", null, null],
    ["Fri BikeShop", "Cykelforretning med salg og værksted.", null, "Vestergade 37, 5800 Nyborg\nTlf. 65 31 78 22"],
    ["TYR", "Svømme- og triatlonudstyr. Køb i TYRs webshop.", "Klubrabat i webshoppen", "Handl på tyrdanmark.dk. Rabatkoden får du hos bestyrelsen."],
    ["Løbexperten", "Løbebutik i Odense med professionel vejledning.", "20 % rabat (undtagen ure)", "Skibhusvej 52c, 5000 Odense C\nNævn dit medlemskab af NyborgTri ved betaling.\nÅbent man–fre 10–17.30, lør 10–13."],
    ["FIT 4 RUN", "Løbe- og triatlontøj kun til kvinder, med stort udvalg.", "20 % rabat", "Skibhusvej 82, 5000 Odense C"],
  ];
  for (const [name, description, discount, details] of info) {
    await prisma.sponsor.updateMany({ where: { name, description: null }, data: { description, discount, details } });
  }

  // Kontaktpersoner fra den gamle kontaktside (kun hvis admin ikke har oprettet nogen)
  if ((await prisma.contactPerson.count()) === 0) {
    await prisma.contactPerson.createMany({
      data: [
        { role: "Formand", name: "Morten Hansen", phone: "22446633", sortOrder: 0 },
        { role: "Næstformand", name: "Kenneth Thorsgaard", phone: "29915402", sortOrder: 1 },
      ],
    });
  }

  console.log("Seed færdig");
}

main().finally(() => prisma.$disconnect());
