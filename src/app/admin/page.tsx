import { revalidatePath } from "next/cache";
import type { AthleteGroup, Role } from "@prisma/client";
import { requireAdmin } from "@/auth";
import { GROUP_LABEL, GROUPS, ROLE_LABEL, ROLES, userTypeLabel } from "@/lib/roles";
import { AdminNav } from "@/components/AdminNav";
import { prisma } from "@/lib/db";
import { dato } from "@/lib/format";

export const metadata = { title: "Admin – medlemmer" };

async function setUserType(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  const role = String(formData.get("role")) as Role;
  const group = String(formData.get("group"));
  if (!ROLES.includes(role)) return;
  // En admin kan ikke fjerne sin egen admin-adgang ved et uheld
  if (id === admin.id && role !== "ADMIN") return;
  await prisma.user.update({
    where: { id },
    data: { role, athleteGroup: GROUPS.includes(group as AthleteGroup) ? (group as AthleteGroup) : null },
  });
  revalidatePath("/admin");
}

export default async function AdminMembers({ searchParams }: { searchParams: Promise<{ vis?: string }> }) {
  await requireAdmin();
  const { vis = "aktive" } = await searchParams;
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

  const users = await prisma.user.findMany({
    include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { type: true } } },
    orderBy: { name: "asc" },
  });
  const rows = users.map((u) => ({ u, m: u.memberships[0] ?? null }));
  const active = rows.filter((r) => r.m && r.m.endDate > now);
  const filtered =
    vis === "aktive" ? active
    : vis === "udloeber" ? active.filter((r) => r.m!.endDate < soon)
    : vis === "udloebet" ? rows.filter((r) => r.m && r.m.endDate <= now)
    : vis === "TRAINER" || vis === "ADMIN" ? rows.filter((r) => r.u.role === vis)
    : GROUPS.includes(vis as AthleteGroup) ? rows.filter((r) => r.u.athleteGroup === vis)
    : rows;
  const typeCounts = rows.reduce<Record<string, number>>((acc, { u }) => ((acc[userTypeLabel(u.role, u.athleteGroup)] = (acc[userTypeLabel(u.role, u.athleteGroup)] ?? 0) + 1), acc), {});
  const byType = active.reduce<Record<string, number>>((acc, r) => ((acc[r.m!.type.name] = (acc[r.m!.type.name] ?? 0) + 1), acc), {});

  return (
    <>
      <h1>Medlemmer</h1>
      <AdminNav />
      <div className="grid" style={{ marginBottom: 24 }}>
        <div className="card"><strong style={{ fontSize: "2rem" }}>{active.length}</strong><br />aktive medlemmer</div>
        {Object.entries(byType).map(([k, v]) => (
          <div className="card" key={k}><strong style={{ fontSize: "2rem" }}>{v}</strong><br />{k}</div>
        ))}
      </div>
      <p className="muted">Brugertyper: {Object.entries(typeCounts).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
      <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[["aktive", "Aktive"], ["udloeber", "Udløber inden 30 dage"], ["udloebet", "Udløbet"], ["ADMIN", "Admins"], ["TRAINER", "Trænere"], ["ELITE", "Elite"], ["BREDDE", "Bredde"], ["BOERN", "Børn"], ["alle", "Alle brugere"]].map(([k, l]) => (
          <a key={k} href={`/admin?vis=${k}`} style={{ fontWeight: vis === k ? 700 : 400 }}>{l}</a>
        ))}
      </p>
      <div className="table-scroll">
        <table className="list">
          <thead><tr><th>Navn</th><th>E-mail</th><th>Telefon</th><th>Medlemskab</th><th>Gyldig til</th><th>Brugertype</th></tr></thead>
          <tbody>
            {filtered.map(({ u, m }) => (
              <tr key={u.id}>
                <td>{u.name ?? "–"}<br /><span className="muted">{userTypeLabel(u.role, u.athleteGroup)}</span></td>
                <td>{u.email}</td>
                <td>{u.phone ?? ""}</td>
                <td>{m?.type.name ?? "–"}</td>
                <td className={m && m.endDate > now ? "status-ok" : "status-warn"}>{m ? dato(m.endDate) : "Aldrig betalt"}</td>
                <td>
                  <form action={setUserType} className="inline-form">
                    <input type="hidden" name="id" value={u.id} />
                    <select name="role" defaultValue={u.role} aria-label="Rolle">
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                    <select name="group" defaultValue={u.athleteGroup ?? ""} aria-label="Gruppe">
                      <option value="">Ingen gruppe</option>
                      {GROUPS.map((g) => <option key={g} value={g}>{GROUP_LABEL[g]}</option>)}
                    </select>
                    <button className="button small" type="submit">Gem</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
