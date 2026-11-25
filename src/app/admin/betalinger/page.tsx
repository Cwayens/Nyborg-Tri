import { revalidatePath } from "next/cache";
import { requireTreasurer } from "@/lib/staff";
import { prisma } from "@/lib/db";
import { syncPayment } from "@/lib/accounting";
import { dato, kr } from "@/lib/format";

export const metadata = { title: "Admin – betalinger" };

const LABEL = { NOT_SENT: "Ikke sendt", SENT: "Bogført", FAILED: "Fejl", SKIPPED: "Ingen integration" } as const;

export default async function AdminPayments() {
  await requireTreasurer();
  const payments = await prisma.payment.findMany({
    where: { status: { in: ["PAID", "REFUNDED"] } },
    include: { user: true },
    orderBy: { paidAt: "desc" },
    take: 200,
  });

  async function resync(formData: FormData) {
    "use server";
    await requireTreasurer();
    await syncPayment(String(formData.get("id")));
    revalidatePath("/admin/betalinger");
  }

  const total = payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amountOre, 0);
  return (
    <>
      <h1>Betalinger</h1>
      <p>Seneste {payments.length} betalinger, i alt {kr(total)}.</p>
      <div className="table-scroll">
        <table className="list">
          <thead><tr><th>Dato</th><th>Medlem</th><th>Beskrivelse</th><th>Beløb</th><th>Status</th><th>Økonomi</th><th /></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.paidAt && dato(p.paidAt)}</td>
                <td>{p.user.name ?? p.user.email}</td>
                <td>{p.description}</td>
                <td>{kr(p.amountOre)}</td>
                <td>{p.status === "PAID" ? "Betalt" : "Refunderet"}</td>
                <td className={p.accountingStatus === "FAILED" ? "status-warn" : undefined} title={p.accountingError ?? undefined}>
                  {LABEL[p.accountingStatus]}{p.accountingRef ? ` (#${p.accountingRef})` : ""}
                </td>
                <td>
                  {(p.accountingStatus === "FAILED" || p.accountingStatus === "NOT_SENT") && (
                    <form action={resync}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="button small" type="submit">Send igen</button>
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
