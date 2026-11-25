import { revalidatePath } from "next/cache";
import type { Duty, Role } from "@prisma/client";
import { DUTIES, DUTY_LABEL } from "@/lib/staff";
import { requireAdmin } from "@/auth";
import { ROLE_LABEL, ROLES } from "@/lib/roles";
import { getTeams } from "@/lib/visibility";
import { prisma } from "@/lib/db";
import { dato } from "@/lib/format";

export const metadata = { title: "Admin – medlemmer" };

async function setUserType(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  const role = String(formData.get("role")) as Role;
  const teamId = String(formData.get("team") ?? "");
  if (!ROLES.includes(role)) return;
  const team = teamId ? await prisma.team.findUnique({ where: { id: teamId }, select: { kind: true } }) : null;
  // Børn kan ikke have ekstra roller (child-safety.ts)
  const duties = role === "ATHLETE" && team?.kind === "BOERN" ? [] : DUTIES.filter((d) => formData.get(`duty_${d}`) === "on");
  // En admin kan ikke fjerne sin egen admin-adgang ved et uheld
  if (id === admin.id && role !== "ADMIN") return;
  await prisma.user.update({
    where: { id },
    // Holdet bestemmer gruppen (elite/bredde/børn) via databasens trigger
    data: team ? { role, teamId, duties } : { role, teamId: null, athleteGroup: null, duties },
  });
  revalidatePath("/admin");
}

export default async function AdminMembers({ searchParams }: { searchParams: Promise<{ vis?: string }> }) {
  await requireAdmin();
  const { vis = "aktive" } = await searchParams;
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

  const teams = await getTeams();
  const teamName = new Map(teams.map((t) => [t.id, t.label]));
  const typeLabel = (u: { role: Role; teamId: string | null }) =>
    u.role === "ATHLETE" ? (u.teamId ? `Atlet – ${teamName.get(u.teamId)}` : "Atlet") : ROLE_LABEL[u.role];
  const extra = (u: { duties: Duty[]; leads: { name: string }[] }) =>
    [...u.duties.map((d) => DUTY_LABEL[d]), ...u.leads.map((t) => `Holdleder ${t.name}`)].join(" · ");
  const users = await prisma.user.findMany({
    include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { type: true } }, leads: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  const rows = users.map((u) => ({ u, m: u.memberships[0] ?? null }));
  const active = rows.filter((r) => r.m && r.m.endDate > now);
  const filtered =
    vis === "aktive" ? active
    : vis === "udloeber" ? active.filter((r) => r.m!.endDate < soon)
    : vis === "udloebet" ? rows.filter((r) => r.m && r.m.endDate <= now)
    : vis === "TRAINER" || vis === "ADMIN" ? rows.filter((r) => r.u.role === vis)
    : teamName.has(vis) ? rows.filter((r) => r.u.teamId === vis)
    : DUTIES.includes(vis as Duty) ? rows.filter((r) => r.u.duties.includes(vis as Duty))
    : vis === "holdledere" ? rows.filter((r) => r.u.leads.length > 0)
    : rows;
  const typeCounts = rows.reduce<Record<string, number>>((acc, { u }) => ((acc[typeLabel(u)] = (acc[typeLabel(u)] ?? 0) + 1), acc), {});
  const byType = active.reduce<Record<string, number>>((acc, r) => ((acc[r.m!.type.name] = (acc[r.m!.type.name] ?? 0) + 1), acc), {});

  return (
    <>
      <h1>Medlemmer</h1>
      <div className="grid" style={{ marginBottom: 24 }}>
        <div className="card"><strong style={{ fontSize: "2rem" }}>{active.length}</strong><br />aktive medlemmer</div>
        {Object.entries(byType).map(([k, v]) => (
          <div className="card" key={k}><strong style={{ fontSize: "2rem" }}>{v}</strong><br />{k}</div>
        ))}
      </div>
      <p className="muted">Brugertyper: {Object.entries(typeCounts).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
      <p className="filters">
        {[["aktive", "Aktive"], ["udloeber", "Udløber inden 30 dage"], ["udloebet", "Udløbet"], ["ADMIN", "Admins"], ["TRAINER", "Trænere"], ["holdledere", "Holdledere"], ["TREASURER", "Kasserere"], ["VOLUNTEER", "Frivillige"], ...teams.map((t) => [t.id, t.label]), ["alle", "Alle brugere"]].map(([k, l]) => (
          <a key={k} href={`/admin?vis=${k}`} className={vis === k ? "active" : undefined} aria-current={vis === k ? "page" : undefined}>{l}</a>
        ))}
      </p>
      <div className="table-scroll">
        <table className="list">
          <thead><tr><th>Navn</th><th>E-mail</th><th>Telefon</th><th>Medlemskab</th><th>Gyldig til</th><th>Brugertype</th></tr></thead>
          <tbody>
            {filtered.map(({ u, m }) => (
              <tr key={u.id}>
                <td>{u.name ?? "–"}<br /><span className="muted">{typeLabel(u)}{extra(u) && ` · ${extra(u)}`}</span></td>
                <td>{u.email}</td>
                <td>{u.phone ?? ""}</td>
                <td>{m?.type.name ?? "–"}{m?.source === "TRIAL" ? " (prøve)" : m?.source === "CODE" ? " (kode)" : ""}</td>
                <td className={m && m.endDate > now ? "status-ok" : "status-warn"}>{m ? dato(m.endDate) : "Aldrig betalt"}</td>
                <td>
                  <form action={setUserType} className="inline-form">
                    <input type="hidden" name="id" value={u.id} />
                    <select name="role" defaultValue={u.role} aria-label="Rolle">
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                    <select name="team" defaultValue={u.teamId ?? ""} aria-label="Hold">
                      <option value="">Intet hold</option>
                      {teams.filter((t) => t.active || t.id === u.teamId).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    {DUTIES.map((d) => (
                      <label key={d} className="check" style={{ margin: 0 }}><input type="checkbox" name={`duty_${d}`} defaultChecked={u.duties.includes(d)} /> {DUTY_LABEL[d]}</label>
                    ))}
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
