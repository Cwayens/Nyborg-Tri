import Link from "next/link";
import { requireTreasurer } from "@/lib/staff";
import { dato, kr } from "@/lib/format";
import { arrears } from "@/lib/finance-db";
import { FinanceNav } from "../FinanceNav";
import { sendReminder } from "../actions";

export const metadata = { title: "Admin – restancer" };

export default async function Arrears({ searchParams }: { searchParams: Promise<{ sendt?: string; ikkesendt?: string }> }) {
  await requireTreasurer("/admin/oekonomi/restancer");
  const sp = await searchParams;
  const { unpaid, lapsed } = await arrears();
  const year = new Date().getFullYear();
  const Remind = ({ id }: { id: string }) => (
    <form action={sendReminder}><input type="hidden" name="userId" value={id} /><button className="button small secondary" type="submit">Send påmindelse</button></form>
  );
  return (
    <>
      <h1>Restancer</h1>
      <FinanceNav active="/restancer" year={year} />
      {sp.sendt && <p className="notice">Påmindelsen er sendt til {sp.sendt}.</p>}
      {sp.ikkesendt && <p className="status-warn">Mailen til {sp.ikkesendt} kunne ikke sendes. Prøv igen senere.</p>}

      <section className="card" style={{ marginBottom: 20 }}>
        <h2 className="h3" style={{ marginTop: 0 }}>Ubetalte kontingenter ({unpaid.length} · {kr(unpaid.reduce((t, p) => t + p.amountOre, 0))})</h2>
        <p className="muted" style={{ marginTop: 0 }}>Startet for mere end to dage siden, men ikke betalt. Under 18 år: betalingslinket er sendt til forælderen.</p>
        {unpaid.length === 0 ? <p>Ingen. 🎉</p> : (
          <div className="table-scroll">
            <table className="list">
              <thead><tr><th>Medlem</th><th>Beskrivelse</th><th className="num">Beløb</th><th>Startet</th><th>Status</th><th /></tr></thead>
              <tbody>
                {unpaid.map((p) => (
                  <tr key={p.id}>
                    <td>{p.user.name ?? p.user.email}<br /><small className="muted"><a href={`mailto:${p.payLinkSentTo ?? p.user.email}`}>{p.payLinkSentTo ?? p.user.email}</a>{p.payLinkSentTo && " (forælder)"}</small></td>
                    <td>{p.description}</td>
                    <td className="num">{kr(p.amountOre)}</td>
                    <td>{dato(p.createdAt)}</td>
                    <td>{p.status === "FAILED" ? <span className="status-warn">Afvist</span> : "Afventer"}</td>
                    <td><Remind id={p.user.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="h3" style={{ marginTop: 0 }}>Ikke fornyet ({lapsed.length})</h2>
        <p className="muted" style={{ marginTop: 0 }}>Medlemskabet er udløbet inden for det seneste år og ikke fornyet. Prøveperioder og passive medlemmer er ikke med.</p>
        {lapsed.length === 0 ? <p>Ingen. 🎉</p> : (
          <div className="table-scroll">
            <table className="list">
              <thead><tr><th>Medlem</th><th>Medlemstype</th><th>Udløb</th><th className="num">Kontingent</th><th /></tr></thead>
              <tbody>
                {lapsed.map((u) => {
                  const m = u.memberships[0];
                  return (
                    <tr key={u.id}>
                      <td>{u.name ?? u.email}<br /><small className="muted"><a href={`mailto:${u.guardianEmail ?? u.email}`}>{u.guardianEmail ?? u.email}</a>{u.guardianEmail && " (forælder)"}</small></td>
                      <td>{m.type.name}</td>
                      <td>{dato(m.endDate)}</td>
                      <td className="num">{kr(m.type.priceOre)}</td>
                      <td><Remind id={u.id} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small" style={{ marginBottom: 0 }}>Påmindelsen er en venlig mail med et link til at forny. Medlemmer, der ikke vil fortsætte, kan svare på mailen. Se også <Link href="/admin">Medlemmer</Link>.</p>
      </section>
    </>
  );
}
