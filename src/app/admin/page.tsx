import { requireAdmin } from "@/auth";
import { AdminNav } from "@/components/AdminNav";
import { prisma } from "@/lib/db";
import { dato } from "@/lib/format";

export const metadata = { title: "Admin – medlemmer" };

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
    : rows;
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
      <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[["aktive", "Aktive"], ["udloeber", "Udløber inden 30 dage"], ["udloebet", "Udløbet"], ["alle", "Alle brugere"]].map(([k, l]) => (
          <a key={k} href={`/admin?vis=${k}`} style={{ fontWeight: vis === k ? 700 : 400 }}>{l}</a>
        ))}
      </p>
      <div className="table-scroll">
        <table className="list">
          <thead><tr><th>Navn</th><th>E-mail</th><th>Telefon</th><th>Type</th><th>Gyldig til</th></tr></thead>
          <tbody>
            {filtered.map(({ u, m }) => (
              <tr key={u.id}>
                <td>{u.name ?? "–"}{u.role === "ADMIN" ? " (admin)" : ""}</td>
                <td>{u.email}</td>
                <td>{u.phone ?? ""}</td>
                <td>{m?.type.name ?? "–"}</td>
                <td className={m && m.endDate > now ? "status-ok" : "status-warn"}>{m ? dato(m.endDate) : "Aldrig betalt"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
