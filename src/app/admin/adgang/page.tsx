import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/auth";
import { AdminNav } from "@/components/AdminNav";
import { TRIAL_DAYS, generateCode, grantMembership } from "@/lib/access";
import { prisma } from "@/lib/db";
import { dato } from "@/lib/format";

export const metadata = { title: "Admin – prøveperioder og koder" };

async function decideTrial(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  const approve = formData.get("decision") === "approve";
  await prisma.$transaction(async (tx) => {
    const req = await tx.trialRequest.findUniqueOrThrow({ where: { id }, include: { user: true } });
    if (req.status !== "PENDING") return;
    await tx.trialRequest.update({ where: { id }, data: { status: approve ? "APPROVED" : "REJECTED", decidedAt: new Date(), decidedById: admin.id } });
    if (approve) {
      const code = req.user.athleteGroup === "BOERN" ? "YOUTH" : "ADULT";
      const type = await tx.membershipType.findUniqueOrThrow({ where: { code } });
      await grantMembership(tx, { userId: req.userId, typeId: type.id, days: TRIAL_DAYS, source: "TRIAL" });
      if (!req.user.athleteGroup) await tx.user.update({ where: { id: req.userId }, data: { athleteGroup: "BREDDE" } });
    }
  });
  revalidatePath("/admin/adgang");
}

async function createCodes(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const count = Math.min(50, Math.max(1, Number(formData.get("count")) || 1));
  const days = Math.min(730, Math.max(1, Number(formData.get("days")) || 365));
  const typeId = String(formData.get("typeId"));
  const note = String(formData.get("note") ?? "").trim() || null;
  await prisma.membershipType.findUniqueOrThrow({ where: { id: typeId } });
  for (let i = 0; i < count; i++) {
    // Ved den usandsynlige kollision prøves igen med en ny kode
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await prisma.accessCode.create({ data: { code: generateCode(), typeId, days, note, createdById: admin.id } });
        break;
      } catch (e) {
        if (attempt === 4) throw e;
      }
    }
  }
  redirect(`/admin/adgang?oprettet=${count}#koder`);
}

async function deleteCode(formData: FormData) {
  "use server";
  await requireAdmin();
  await prisma.accessCode.deleteMany({ where: { id: String(formData.get("id")), usedById: null } });
  revalidatePath("/admin/adgang");
}

export default async function AdminAccess({ searchParams }: { searchParams: Promise<{ oprettet?: string }> }) {
  await requireAdmin();
  const { oprettet } = await searchParams;
  const [requests, codes, types] = await Promise.all([
    prisma.trialRequest.findMany({ include: { user: true, decidedBy: true }, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 100 }),
    prisma.accessCode.findMany({ include: { type: true, usedBy: true }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.membershipType.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const pending = requests.filter((r) => r.status === "PENDING");
  const decided = requests.filter((r) => r.status !== "PENDING");

  return (
    <>
      <h1>Prøveperioder og koder</h1>
      <AdminNav />

      <h2>Ansøgninger om prøveperiode ({pending.length} afventer)</h2>
      {pending.length === 0 && <p className="muted">Ingen ansøgninger afventer.</p>}
      {pending.map((r) => (
        <div key={r.id} className="card" style={{ marginBottom: 12 }}>
          <strong>{r.user.name ?? r.user.email}</strong> · {r.user.email} · {r.user.phone ?? ""}
          <br /><span className="muted">Søgt {dato(r.createdAt)}</span>
          {r.message && <p>{r.message}</p>}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <form action={decideTrial}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="decision" value="approve" />
              <button className="button small approve" type="submit">Godkend {TRIAL_DAYS} dage</button>
            </form>
            <form action={decideTrial}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="decision" value="reject" />
              <button className="button small secondary" type="submit">Afvis</button>
            </form>
          </div>
        </div>
      ))}
      {decided.length > 0 && (
        <details>
          <summary>Tidligere ansøgninger ({decided.length})</summary>
          <ul>
            {decided.map((r) => (
              <li key={r.id}>
                {r.user.name ?? r.user.email}: {r.status === "APPROVED" ? "godkendt" : "afvist"}
                {r.decidedAt ? ` ${dato(r.decidedAt)}` : ""}{r.decidedBy ? ` af ${r.decidedBy.name ?? r.decidedBy.email}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}

      <h2 id="koder">Engangskoder</h2>
      {oprettet && <p className="notice">{oprettet} {oprettet === "1" ? "kode er" : "koder er"} oprettet. Del dem med de personer, der skal have adgang.</p>}
      <form action={createCodes} className="card inline-form" style={{ gap: 12, marginBottom: 16 }}>
        <label>Antal<input type="number" name="count" defaultValue={1} min={1} max={50} style={{ width: 80 }} /></label>
        <label>
          Medlemstype
          <select name="typeId">
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label>Dage<input type="number" name="days" defaultValue={365} min={1} max={730} style={{ width: 90 }} /></label>
        <label>Note<input name="note" placeholder="fx Sponsor 2027" /></label>
        <button className="button" type="submit" style={{ alignSelf: "end" }}>Opret koder</button>
      </form>
      <div className="table-scroll">
        <table className="list">
          <thead><tr><th>Kode</th><th>Giver</th><th>Note</th><th>Status</th><th /></tr></thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id}>
                <td><code>{c.code}</code></td>
                <td>{c.type.name}, {c.days} dage</td>
                <td>{c.note ?? ""}</td>
                <td className={c.usedBy ? "muted" : "status-ok"}>
                  {c.usedBy ? `Brugt af ${c.usedBy.name ?? c.usedBy.email} ${c.usedAt ? dato(c.usedAt) : ""}` : "Ubrugt"}
                </td>
                <td>
                  {!c.usedBy && (
                    <form action={deleteCode}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="button small secondary" type="submit">Slet</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
