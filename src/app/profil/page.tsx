import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { userTypeLabel } from "@/lib/roles";

export const metadata = { title: "Min profil" };

const schema = z.object({
  name: z.string().trim().min(2, "Skriv dit fulde navn").max(80),
  phone: z.string().trim().max(20).optional(),
  birthDate: z.string().optional(),
});

async function saveProfile(formData: FormData) {
  "use server";
  const user = await requireUser("/profil");
  const r = schema.safeParse(Object.fromEntries(formData));
  if (!r.success) redirect("/profil?fejl=" + encodeURIComponent(r.error.issues[0].message));
  const { name, phone, birthDate } = r.data;
  await prisma.user.update({
    where: { id: user.id },
    data: { name, phone: phone || null, birthDate: birthDate ? new Date(birthDate) : null },
  });
  revalidatePath("/", "layout");
  redirect(String(formData.get("next") || "/profil?gemt=1"));
}

export default async function Profile({ searchParams }: { searchParams: Promise<{ fejl?: string; gemt?: string; velkommen?: string }> }) {
  const sessionUser = await requireUser("/profil");
  const { fejl, gemt, velkommen } = await searchParams;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id } });
  return (
    <>
      <h1>{velkommen ? "Velkommen til NyborgTri!" : "Min profil"}</h1>
      {velkommen && <p>Skriv dit navn, så de andre kan se, hvem der kommer til træning.</p>}
      {fejl && <p className="status-warn">{fejl}</p>}
      {gemt && <p className="notice">Din profil er gemt.</p>}
      <form action={saveProfile} className="stack card">
        <input type="hidden" name="next" value={velkommen ? "/min-side" : ""} />
        <label>Fulde navn<input name="name" defaultValue={user.name ?? ""} required autoComplete="name" autoFocus={!!velkommen} /></label>
        <label>Telefon<input name="phone" defaultValue={user.phone ?? ""} autoComplete="tel" inputMode="tel" /></label>
        <label>Fødselsdato<input type="date" name="birthDate" defaultValue={user.birthDate?.toISOString().slice(0, 10) ?? ""} /></label>
        <p className="muted" style={{ margin: 0 }}>
          E-mail: {user.email} · Brugertype: {userTypeLabel(user.role, user.athleteGroup)}
          {!user.athleteGroup && " (en admin tildeler din gruppe)"}
        </p>
        <button className="button" type="submit" style={{ justifySelf: "start" }}>{velkommen ? "Kom i gang" : "Gem"}</button>
      </form>
      {!velkommen && (
        <p style={{ marginTop: 20 }}>
          <Link href="/forbindelser">Ure, deling og kalender</Link> · <Link href="/bliv-medlem">Medlemskab og kvitteringer</Link>
        </p>
      )}
    </>
  );
}
