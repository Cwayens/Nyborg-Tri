import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AthleteGroup } from "@prisma/client";
import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/db";
import { slug, str } from "@/lib/form-rows";
import { NOT_CHILD } from "@/lib/child-safety";

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
  const kind = kindOf(fd);
  // Børnesikkerhed: børnehold ser kun børnehold, voksenhold kun voksenhold, og børnehold er aldrig åbne
  const others = await prisma.team.findMany({ where: { id: { not: id } }, select: { id: true, kind: true } });
  const sees = fd.getAll("sees").map(String).filter((s) => others.some((t) => t.id === s && (t.kind === "BOERN") === (kind === "BOERN")));
  const branchId = str(fd, "branchId");
  const branch = branchId ? await prisma.branch.findUnique({ where: { id: branchId } }) : null;
  // Holdledere: fjern de afkrydsede, tilføj den valgte. Databasen afviser atleter på børnehold og børn som holdledere.
  const remove = fd.getAll("removeLeader").map(String);
  const addLeader = str(fd, "addLeader");
  const leaderOk = addLeader ? await prisma.user.findFirst({ where: { id: addLeader, deletedAt: null, ...(kind === "BOERN" ? { role: { in: ["TRAINER", "ADMIN"] } } : NOT_CHILD) } }) : null;
  if (addLeader && !leaderOk) back("fejl=" + encodeURIComponent("Et børnehold kan kun ledes af trænere og admin, og børn kan ikke være holdledere"));
  await prisma.team.update({ where: { id }, data: { leaders: { disconnect: remove.map((u) => ({ id: u })), ...(leaderOk ? { connect: { id: leaderOk.id } } : {}) } } });
  await prisma.team.update({ where: { id }, data: { ...(fd.has("branchId") ? { branchId: branch?.id ?? null } : {}), name, kind, sees, public: kind !== "BOERN" && fd.get("public") === "on", active, sortOrder: Number(str(fd, "sortOrder")) || 0 } });
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
  const branch = str(fd, "branchId") ? await prisma.branch.findUnique({ where: { id: str(fd, "branchId") } }) : null;
  await prisma.team.create({ data: { id, name, kind: kindOf(fd), branchId: branch?.id ?? null, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
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

// ---------- Afdelinger (netværk med flere byer eller klubber) ----------

async function saveBranch(fd: FormData) {
  "use server";
  await requireAdmin();
  const name = str(fd, "name", 40);
  if (!name) back("fejl=" + encodeURIComponent("Skriv afdelingens navn"));
  await prisma.branch.update({ where: { id: str(fd, "id") }, data: { name, city: str(fd, "city", 60) || null, sortOrder: Number(str(fd, "sortOrder")) || 0 } });
  revalidatePath("/", "layout");
  back("gemt=1");
}

async function addBranch(fd: FormData) {
  "use server";
  await requireAdmin();
  const name = str(fd, "name", 40);
  if (!name) back("fejl=" + encodeURIComponent("Skriv afdelingens navn"));
  const max = await prisma.branch.aggregate({ _max: { sortOrder: true } });
  const b = await prisma.branch.create({ data: { name, city: str(fd, "city", 60) || null, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
  // Den første afdeling får klubbens eksisterende hold
  if ((await prisma.branch.count()) === 1) await prisma.team.updateMany({ where: { branchId: null }, data: { branchId: b.id } });
  revalidatePath("/", "layout");
  back("gemt=1");
}

async function removeBranch(fd: FormData) {
  "use server";
  await requireAdmin();
  const b = await prisma.branch.findUnique({ where: { id: str(fd, "id") }, include: { _count: { select: { teams: true } } } });
  if (!b) return;
  if (b._count.teams && (await prisma.branch.count()) > 1) back("fejl=" + encodeURIComponent(`${b.name} har hold. Flyt dem til en anden afdeling først.`));
  await prisma.branch.delete({ where: { id: b.id } });
  revalidatePath("/", "layout");
  back("gemt=1");
}

export default async function Teams({ searchParams }: { searchParams: Promise<{ gemt?: string; fejl?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const branches = await prisma.branch.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { _count: { select: { teams: true } } } });
  const teams = await prisma.team.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { _count: { select: { members: true, trainings: true } }, leaders: { select: { id: true, name: true, email: true } } } });
  // Mulige holdledere: voksne medlemmer (ikke børn). Børnehold: kun trænere og admin.
  const adults = await prisma.user.findMany({ where: { deletedAt: null, ...NOT_CHILD }, select: { id: true, name: true, email: true, role: true }, orderBy: { name: "asc" } });
  return (
    <>
      <h1>Hold</h1>
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
                {branches.length > 0 && <label>Afdeling
                  <select name="branchId" defaultValue={t.branchId ?? ""}>
                    <option value="">Hele netværket</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </label>}
                <label>Rækkefølge<input name="sortOrder" type="number" defaultValue={t.sortOrder} /></label>
              </div>
              {teams.some((o) => o.id !== t.id && (o.kind === "BOERN") === (t.kind === "BOERN")) && (
                <fieldset>
                  <legend>Ser også træninger for</legend>
                  {teams.filter((o) => o.id !== t.id && (o.kind === "BOERN") === (t.kind === "BOERN")).map((o) => (
                    <label key={o.id} className="check"><input type="checkbox" name="sees" value={o.id} defaultChecked={t.sees.includes(o.id)} /> {o.name}</label>
                  ))}
                </fieldset>
              )}
              {t.kind !== "BOERN" && <label className="check"><input type="checkbox" name="public" defaultChecked={t.public} /><span>Åbent hold: besøgende og prøvemedlemmer kan se holdets træninger (kun tid og sted)</span></label>}
              <fieldset>
                <legend>Holdledere</legend>
                <p className="muted" style={{ margin: "0 0 6px" }}>
                  {t.kind === "BOERN" ? "Børnehold ledes kun af trænere og admin." : "En holdleder opretter og retter træninger og skriver mail til holdet, men kun for dette hold."}
                </p>
                {t.leaders.map((l) => (
                  <label key={l.id} className="check"><input type="checkbox" name="removeLeader" value={l.id} /> Fjern {l.name ?? l.email}</label>
                ))}
                <label>Tilføj holdleder
                  <select name="addLeader" defaultValue="">
                    <option value="">Vælg medlem</option>
                    {adults.filter((u) => !t.leaders.some((l) => l.id === u.id) && (t.kind !== "BOERN" || u.role !== "ATHLETE")).map((u) => <option key={u.id} value={u.id}>{u.name ?? u.email}</option>)}
                  </select>
                </label>
              </fieldset>
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
          {branches.length > 0 && <label>Afdeling
            <select name="branchId" defaultValue={branches[0].id}>
              <option value="">Hele netværket</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>}
          <label>Type
            <select name="kind" defaultValue="BREDDE">
              {KINDS.map((k) => <option key={k.v} value={k.v} title={k.hint}>{k.label}</option>)}
            </select>
          </label>
        </div>
        <div><button className="button" type="submit">Opret hold</button></div>
      </form>

      <h2 style={{ marginTop: 40 }}>Afdelinger</h2>
      <p className="muted">
        Er I et netværk med flere byer eller klubber, kan hver afdeling have sine egne hold. Medlemmerne kan filtrere kalenderen på afdeling,
        og I kan sende mail til en hel afdeling. Med kun én afdeling (eller ingen) vises afdelinger ingen steder.
      </p>
      <div className="stack">
        {branches.map((b) => (
          <div key={b.id} className="card admin-form" style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
            <form action={saveBranch} className="row" style={{ flex: 1, alignItems: "end" }}>
              <input type="hidden" name="id" value={b.id} />
              <label>Navn<input name="name" defaultValue={b.name} maxLength={40} required /></label>
              <label>By<input name="city" defaultValue={b.city ?? ""} maxLength={60} /></label>
              <label>Rækkefølge<input name="sortOrder" type="number" defaultValue={b.sortOrder} /></label>
              <div><button className="button small" type="submit">Gem</button></div>
            </form>
            <span className="muted">{b._count.teams} hold</span>
            {(!b._count.teams || branches.length === 1) && (
              <form action={removeBranch}><input type="hidden" name="id" value={b.id} /><button className="button small ghost" type="submit">Slet</button></form>
            )}
          </div>
        ))}
      </div>
      <form action={addBranch} className="card stack admin-form" style={{ marginTop: 16 }}>
        <h3 style={{ margin: 0 }}>Ny afdeling</h3>
        <div className="row">
          <label>Navn<input name="name" maxLength={40} placeholder="fx Svendborg" required /></label>
          <label>By<input name="city" maxLength={60} /></label>
        </div>
        {branches.length === 0 && <p className="muted" style={{ margin: 0 }}>Den første afdeling får klubbens nuværende hold. Opret derefter den næste.</p>}
        <div><button className="button" type="submit">Opret afdeling</button></div>
      </form>
    </>
  );
}
