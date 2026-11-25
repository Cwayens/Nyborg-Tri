import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTreasurer } from "@/lib/staff";
import { prisma } from "@/lib/db";
import { slug, str } from "@/lib/form-rows";

export const metadata = { title: "Admin – medlemstyper" };

// Medlemstyper og priser. Koderne ADULT, YOUTH og PASSIVE har en særlig betydning (fremhævet på forsiden,
// børnegruppe og ingen adgang til træning), så de kan ikke slettes, men gerne omdøbes og skjules.
const SPECIAL: Record<string, string> = { ADULT: "Fremhæves på forsiden", YOUTH: "Nye medlemmer kommer i børnegruppen", PASSIVE: "Støttemedlem uden adgang til træning" };

const price = (fd: FormData) => {
  const v = Number(str(fd, "price").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(v) && v >= 0 && v <= 100000 ? Math.round(v * 100) : null;
};

async function save(fd: FormData) {
  "use server";
  await requireTreasurer();
  const id = str(fd, "id");
  const p = price(fd);
  const name = str(fd, "name", 60);
  if (!name || p === null) redirect("/admin/medlemstyper?fejl=" + encodeURIComponent("Skriv navn og pris i kroner"));
  await prisma.membershipType.update({
    where: { id },
    data: { name, description: str(fd, "description", 300) || null, priceOre: p!, active: fd.get("active") === "on", sortOrder: Number(str(fd, "sortOrder")) || 0 },
  });
  revalidatePath("/", "layout");
  redirect("/admin/medlemstyper?gemt=1");
}

async function add(fd: FormData) {
  "use server";
  await requireTreasurer();
  const name = str(fd, "name", 60);
  const p = price(fd);
  if (!name || p === null) redirect("/admin/medlemstyper?fejl=" + encodeURIComponent("Skriv navn og pris i kroner"));
  let code = slug(name).toUpperCase().replace(/-/g, "_").slice(0, 24);
  if (await prisma.membershipType.findFirst({ where: { code } })) code = `${code}_${Date.now().toString(36).slice(-4).toUpperCase()}`;
  const max = await prisma.membershipType.aggregate({ _max: { sortOrder: true } });
  await prisma.membershipType.create({ data: { code, name, description: str(fd, "description", 300) || null, priceOre: p!, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
  revalidatePath("/", "layout");
  redirect("/admin/medlemstyper?gemt=1");
}

async function remove(fd: FormData) {
  "use server";
  await requireTreasurer();
  const t = await prisma.membershipType.findUnique({ where: { id: str(fd, "id") }, include: { _count: { select: { memberships: true, accessCodes: true } } } });
  if (!t || SPECIAL[t.code]) return;
  // Er typen brugt, skjules den i stedet, så historikken bevares
  if (t._count.memberships || t._count.accessCodes) await prisma.membershipType.update({ where: { id: t.id }, data: { active: false } });
  else await prisma.membershipType.delete({ where: { id: t.id } });
  revalidatePath("/", "layout");
  redirect("/admin/medlemstyper?gemt=1");
}

export default async function MembershipTypes({ searchParams }: { searchParams: Promise<{ gemt?: string; fejl?: string }> }) {
  await requireTreasurer();
  const sp = await searchParams;
  const types = await prisma.membershipType.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { memberships: true } } } });
  return (
    <>
      <h1>Medlemstyper og priser</h1>
      {sp.gemt && <p className="notice">Gemt. Priserne ses med det samme på forsiden og ved indmeldelse.</p>}
      {sp.fejl && <p className="status-warn">{sp.fejl}</p>}
      <p className="muted">Prisen er for et år. Skjulte typer kan ikke vælges ved indmeldelse, men medlemmer, der har dem, beholder dem.</p>
      <div className="stack">
        {types.map((t) => (
          <form key={t.id} action={save} className="card stack admin-form">
            <input type="hidden" name="id" value={t.id} />
            <div className="row">
              <label>Navn<input name="name" defaultValue={t.name} maxLength={60} required /></label>
              <label>Pris pr. år (kr)<input name="price" inputMode="decimal" defaultValue={String(t.priceOre / 100).replace(".", ",")} required /></label>
              <label>Rækkefølge<input name="sortOrder" type="number" defaultValue={t.sortOrder} /></label>
            </div>
            <label>Beskrivelse<input name="description" defaultValue={t.description ?? ""} maxLength={300} /></label>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <label className="check"><input type="checkbox" name="active" defaultChecked={t.active} /> <span>Kan vælges ved indmeldelse</span></label>
              <span className="muted small">{t._count.memberships} medlemskaber{SPECIAL[t.code] ? ` · ${SPECIAL[t.code]}` : ""}</span>
              <button className="button small" type="submit">Gem</button>
              {!SPECIAL[t.code] && <button className="button small ghost" type="submit" formAction={remove}>{t._count.memberships ? "Skjul" : "Slet"}</button>}
            </div>
          </form>
        ))}
        <form action={add} className="card stack admin-form">
          <h2 className="h3" style={{ margin: 0 }}>Ny medlemstype</h2>
          <div className="row">
            <label>Navn<input name="name" placeholder="fx Familie" maxLength={60} required /></label>
            <label>Pris pr. år (kr)<input name="price" inputMode="decimal" placeholder="1200" required /></label>
          </div>
          <label>Beskrivelse<input name="description" maxLength={300} placeholder="fx To voksne og børn under 18" /></label>
          <div><button className="button" type="submit">Tilføj</button></div>
        </form>
      </div>
    </>
  );
}
