import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { isoDate } from "@/lib/format";

export async function GET() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return new Response("Forbidden", { status: 403 });

  const users = await prisma.user.findMany({
    include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { type: true } } },
    orderBy: { name: "asc" },
  });
  const now = new Date();
  const csv = toCsv(
    users.map((u) => {
      const m = u.memberships[0];
      return {
        Navn: u.name, Email: u.email, Telefon: u.phone, Adresse: u.address, Postnr: u.zip, By: u.city,
        Foedselsdato: u.birthDate ? isoDate(u.birthDate) : "",
        Medlemstype: m?.type.name ?? "", Start: m ? isoDate(m.startDate) : "", Slut: m ? isoDate(m.endDate) : "",
        Aktiv: m && m.endDate > now ? "Ja" : "Nej",
      };
    }),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="medlemmer-${isoDate(now)}.csv"`,
    },
  });
}
