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

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (adminEmail) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: "ADMIN" },
      create: { email: adminEmail, role: "ADMIN" },
    });
    console.log(`Administrator: ${adminEmail}`);
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

  console.log("Seed færdig");
}

main().finally(() => prisma.$disconnect());
