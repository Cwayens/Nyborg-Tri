import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AthleteGroup } from "@prisma/client";
import { requireAdmin } from "@/auth";
import { AdminNav } from "@/components/AdminNav";
import { prisma } from "@/lib/db";
import { slug, str } from "@/lib/form-rows";

export const metadata = { title: "Admin – hold" };

// Klubbens hold. Typen styrer de regler, der følger med: børnehold får mails via forældre og eget chatrum,
// konkurrencehold kan have atletprofiler. Synlighed: man ser eget hold og de hold, holdet er sat til at se.
const KINDS: { v: AthleteGroup; label: string; hint: string }[] = [
  { v: "ELITE", label: "Konkurrence", hint: "kan få atletprofil på siden" },
  { v: "BREDDE", label: "Motion og bredde", hint: "almindeligt voksenhold" },
  { v: "BOERN", label: "Børn og unge", hint: "mails går til forældre, eget chatrum" },
];
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.v, k.label])) as Record<AthleteGroup, string>;
const back = (q: string): never => redirect(`/admin/hold?${q}`);
const kindOf = (fd: FormData): AthleteGroup => (KINDS.some((k) => k.v === fd.get("kind")) ? (fd.get("kind") as AthleteGroup) : "BREDDE");

async function save(fd: FormData) {
  "use server";
  await requireAdmin();
  const id = str(fd, "id");
  const name = str(fd, "name", 40);
  if (!name) back("fejl=" + encodeURIComponent("Skriv et navn"));
  const all = await prisma.team.findMany({ select: { id: true, active: true } });
  const active = fd.get("active") === "on";
  if (!active && all.filter((t) => t.active && t.id !== id).length === 0) back("fejl=" + encodeURIComponent("Der skal være mindst ét aktivt hold"));
  const sees = fd.getAll("sees").map(String).filter((s) => s !== id && all.some((t) => t.id === s));
  await prisma.team.update({ where: { id }, data: { name, kind: kindOf(fd), sees, public: fd.get("public") === "on", active, sortOrder: Number(str(fd, "sortOrder")) || 0 } });
  revalidatePath("/", "layout");
  back("gemt=1");
}

async function add(fd: FormData) {
  "use server";
  await requireAdmin();
  const name = str(fd, "name", 40);
  if (!name) back("fejl=" + encodeURIComponent("Skriv et navn"));
  let id = `hold-${slug(name) || "nyt"}`;
  if (await prisma.team.findUnique({ where: { id } })) id = `${id}-${Date.now().toString(36).slice(-4)}`;
  const max = await prisma.team.aggregate({ _max: { sortOrder: true } });
  await prisma.team.create({ data: { id, name, kind: kindOf(fd), sortOrder: (max._max.sortOrder ?? 0) + 1 } });
  revalidatePath("/", "layout");
  back("gemt=1");
}

async function remove(fd: FormData) {
  "use server";
  await requireAdmin();
  const t = await prisma.team.findUnique({ where: { id: str(fd, "id") }, include: { _count: { select: { members: true, trainings: true } } } });
  if (!t) return;
  if (t._count.members || t._count.trainings) back("fejl=" + encodeURIComponent(`${t.name} har medlemmer eller træninger. Flyt dem eller skjul holdet i stedet.`));
  if ((await prisma.team.count({ where: { active: true, id: { not: t.id } } })) === 0) back("fejl=" + encodeURIComponent("Der skal være mindst ét aktivt hold"));
  await prisma.$transaction(async (tx) => {
    await tx.team.delete({ where: { id: t.id } });
    // Fjern holdet fra de andre holds "ser også"
    for (const o of await tx.team.findMany({ where: { sees: { has: t.id } } })) await tx.team.update({ where: { id: o.id }, data: { sees: o.sees.filter((s) => s !== t.id) } });
  });
  revalidatePath("/", "layout");
  back("gemt=1");
}

export default async function Teams({ searchParams }: { searchParams: Promise<{ gemt?: string; fejl?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const teams = await prisma.team.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { _count: { select: { members: true, trainings: true } } } });
  return (
    <>
      <h1>Hold</h1>
      <AdminNav />
      {sp.gemt && <p className="notice">Gemt.</p>}
      {sp.fejl && <p className="status-warn">{sp.fejl}</p>}
      <p className="muted">
        Opret de hold, klubben har, fx U13, U17, Motion og Elite. Et medlem ser sit eget holds træninger og de hold, holdet er sat til at se.
        Trænere og admins ser alle hold. Besøgende og prøvemedlemmer ser de åbne hold. Typen styrer reglerne: på børnehold går mails til forældrene, og de har eget chatrum; konkurrencehold kan få atletprofiler. Medlemmer sættes på et hold under <a href="/admin">Medlemmer</a>.
      </p>
      <div className="stack">
        {teams.map((t) => (
          <div key={t.id} className="card stack admin-form">
            <form action={save} className="stack" id={`f-${t.id}`}>
              <input type="hidden" name="id" value={t.id} />
              <div className="row">
                <label>Navn<input name="name" defaultValue={t.name} maxLength={40} required /></label>
                <label>Type
                  <select name="kind" defaultValue={t.kind}>
                    {KINDS.map((k) => <option key={k.v} value={k.v} title={k.hint}>{k.label}</option>)}
                  </select>
                </label>
                <label>Rækkefølge<input name="sortOrder" type="number" defaultValue={t.sortOrder} /></label>
              </div>
              {teams.length > 1 && (
                <fieldset>
                  <legend>Ser også træninger for</legend>
                  {teams.filter((o) => o.id !== t.id).map((o) => (
                    <label key={o.id} className="check"><input type="checkbox" name="sees" value={o.id} defaultChecked={t.sees.includes(o.id)} /> {o.name}</label>
                  ))}
                </fieldset>
              )}
              <label className="check"><input type="checkbox" name="public" defaultChecked={t.public} /><span>Åbent hold: besøgende og prøvemedlemmer kan se holdets træninger (kun tid og sted)</span></label>
              <label className="check"><input type="checkbox" name="active" defaultChecked={t.active} /><span>Aktivt (skjulte hold kan ikke vælges til nye træninger og medlemmer)</span></label>
              <p className="muted" style={{ margin: 0 }}>{KIND_LABEL[t.kind]} · {t._count.members} medlemmer · {t._count.trainings} træninger</p>
            </form>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="button small" type="submit" form={`f-${t.id}`}>Gem</button>
              {!t._count.members && !t._count.trainings && (
                <form action={remove}><input type="hidden" name="id" value={t.id} /><button className="button small ghost" type="submit">Slet</button></form>
              )}
            </div>
          </div>
        ))}
      </div>
      <form action={add} className="card stack admin-form" style={{ marginTop: 24 }}>
        <h2 className="h3" style={{ margin: 0 }}>Nyt hold</h2>
        <div className="row">
          <label>Navn<input name="name" maxLength={40} placeholder="fx U17" required /></label>
          <label>Type
            <select name="kind" defaultValue="BREDDE">
              {KINDS.map((k) => <option key={k.v} value={k.v} title={k.hint}>{k.label}</option>)}
            </select>
          </label>
        </div>
        <div><button className="button" type="submit">Opret hold</button></div>
      </form>
    </>
  );
}
