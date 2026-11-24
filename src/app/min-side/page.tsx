import Link from "next/link";
import { requireUser, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { dato, kr } from "@/lib/format";
import { currentMembership } from "@/lib/membership";
import { userTypeLabel } from "@/lib/roles";

export const metadata = { title: "Min side" };

export default async function MyPage({ searchParams }: { searchParams: Promise<{ betaling?: string }> }) {
  const { betaling } = await searchParams;
  const sessionUser = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id } });
  const [membership, payments] = await Promise.all([
    currentMembership(user.id),
    prisma.payment.findMany({ where: { userId: user.id, status: { in: ["PAID", "REFUNDED"] } }, orderBy: { paidAt: "desc" } }),
  ]);

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <>
      {betaling === "ok" && <p className="notice">Tak for din betaling! Dit medlemskab er registreret (det kan tage et øjeblik, før det vises).</p>}
      <h1>Hej {user.name ?? user.email}</h1>
      <p className="muted">
        Brugertype: {userTypeLabel(user.role, user.athleteGroup)} · <Link href="/kalender">Se dine træninger i kalenderen</Link>
      </p>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Medlemskab</h2>
        {membership ? (
          <p>
            <span className="status-ok">Aktivt</span> · {membership.type.name} · gyldigt til og med {dato(membership.endDate)}
          </p>
        ) : (
          <p>
            <span className="status-warn">Intet aktivt medlemskab</span>
          </p>
        )}
        <Link className="button" href="/bliv-medlem">{membership ? "Forny medlemskab" : "Bliv medlem"}</Link>
      </section>

      <h2>Betalinger</h2>
      {payments.length === 0 ? (
        <p className="muted">Ingen betalinger endnu.</p>
      ) : (
        <div className="table-scroll">
          <table className="list">
            <thead><tr><th>Dato</th><th>Beskrivelse</th><th>Beløb</th><th>Status</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.paidAt && dato(p.paidAt)}</td>
                  <td>{p.description}</td>
                  <td>{kr(p.amountOre)}</td>
                  <td>{p.status === "PAID" ? "Betalt" : "Refunderet"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form action={logout} style={{ marginTop: 32 }}>
        <button className="button secondary small" type="submit">Log ud</button>
      </form>
    </>
  );
}
