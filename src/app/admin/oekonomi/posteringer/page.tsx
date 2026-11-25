import Link from "next/link";
import { requireTreasurer } from "@/lib/staff";
import { prisma } from "@/lib/db";
import { dato, krOre as kr } from "@/lib/format";
import { CATEGORY, categoriesOf, oreToInput } from "@/lib/finance";
import { membershipFees } from "@/lib/finance-db";
import { FinanceNav, YearPicker, yearParam } from "../FinanceNav";
import { deleteEntry, saveEntry } from "../actions";

export const metadata = { title: "Admin – posteringer" };

type Props = { searchParams: Promise<{ aar?: string; ret?: string; fejl?: string; gemt?: string; slettet?: string; vis?: string; kategori?: string }> };

export default async function Entries({ searchParams }: Props) {
  await requireTreasurer("/admin/oekonomi/posteringer");
  const sp = await searchParams;
  const year = yearParam(sp.aar);
  const vis = sp.vis === "INCOME" || sp.vis === "EXPENSE" ? sp.vis : null;
  const kategori = sp.kategori && CATEGORY[sp.kategori] ? sp.kategori : null;
  const [entries, sponsors, editing, fees] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { date: { gte: new Date(`${year}-01-01T00:00:00Z`), lt: new Date(`${year + 1}-01-01T00:00:00Z`) }, ...(vis ? { kind: vis } : {}), ...(kategori ? { category: kategori } : {}) },
      orderBy: [{ date: "desc" }, { voucherNo: "desc" }],
      include: { sponsor: { select: { name: true } }, createdBy: { select: { name: true } } },
    }),
    prisma.sponsor.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }], select: { id: true, name: true, active: true } }),
    sp.ret ? prisma.ledgerEntry.findUnique({ where: { id: sp.ret } }) : null,
    !vis || vis === "INCOME" ? membershipFees(year) : Promise.resolve([]),
  ]);
  const e = editing;
  const today = new Date().toISOString().slice(0, 10);
  const q = (o: Record<string, string | null>) => {
    const p = new URLSearchParams({ aar: String(year), ...(vis ? { vis } : {}), ...(kategori ? { kategori } : {}) });
    for (const [k, v] of Object.entries(o)) (v === null ? p.delete(k) : p.set(k, v));
    return `/admin/oekonomi/posteringer?${p}`;
  };
  const sum = entries.reduce((t, x) => t + (x.kind === "INCOME" ? x.amountOre : -x.amountOre), 0);
  const feeSum = !kategori || kategori === "KONTINGENT" ? fees.reduce((t, p) => t + p.amountOre, 0) : 0;

  return (
    <>
      <h1>Posteringer</h1>
      <FinanceNav active="/posteringer" year={year} />
      {sp.fejl && <p className="status-warn">{sp.fejl}</p>}
      {sp.gemt && <p className="notice">Posteringen er gemt.</p>}
      {sp.slettet && <p className="notice">Posteringen er slettet.</p>}

      <section className="card" id="ny" style={{ marginBottom: 20 }}>
        <h2 className="h3" style={{ marginTop: 0 }}>{e ? `Ret bilag ${e.voucherNo}` : "Ny postering"}</h2>
        <form action={saveEntry} className="stack finance-form" encType="multipart/form-data">
          {e && <input type="hidden" name="id" value={e.id} />}
          <fieldset className="kind-pick">
            <legend className="sr-only">Type</legend>
            <label className="check"><input type="radio" name="kind" value="INCOME" defaultChecked={!e || e.kind === "INCOME"} /> <span>Indtægt</span></label>
            <label className="check"><input type="radio" name="kind" value="EXPENSE" defaultChecked={e?.kind === "EXPENSE"} /> <span>Udgift</span></label>
          </fieldset>
          <div className="row">
            <label>Dato<input type="date" name="date" required defaultValue={e ? e.date.toISOString().slice(0, 10) : today} /></label>
            <label>Beløb (kr.)<input name="amount" required inputMode="decimal" placeholder="fx 1.250,00" defaultValue={e ? oreToInput(e.amountOre) : ""} /></label>
            <label className="cat-income">Kategori
              <select name="categoryIncome" defaultValue={e?.kind === "INCOME" ? e.category : "SPONSOR"}>
                {categoriesOf("INCOME").map((c) => <option key={c.code} value={c.code}>{c.account} {c.label}</option>)}
              </select>
            </label>
            <label className="cat-expense">Kategori
              <select name="categoryExpense" defaultValue={e?.kind === "EXPENSE" ? e.category : "BANELEJE"}>
                {categoriesOf("EXPENSE").map((c) => <option key={c.code} value={c.code}>{c.account} {c.label}</option>)}
              </select>
            </label>
          </div>
          <label>Tekst<input name="text" required maxLength={200} placeholder="fx Baneleje svømmehal, januar" defaultValue={e?.text ?? ""} /></label>
          <div className="row">
            <label>Modpart (valgfri)<input name="counterparty" maxLength={120} placeholder="fx Nyborg Kommune" defaultValue={e?.counterparty ?? ""} /></label>
            {sponsors.length > 0 && (
              <label className="cat-income">Sponsor (ved sponsorater)
                <select name="sponsorId" defaultValue={e?.sponsorId ?? ""}>
                  <option value="">Ingen</option>
                  {sponsors.map((s) => <option key={s.id} value={s.id}>{s.name}{s.active ? "" : " (inaktiv)"}</option>)}
                </select>
              </label>
            )}
          </div>
          <label>Bilag (billede eller PDF, valgfrit)<input type="file" name="bilag" accept="image/png,image/jpeg,image/webp,application/pdf" />
            <small className="muted">Tag et billede af kvitteringen med telefonen, eller vælg en PDF. Højst 4 MB.</small>
          </label>
          {e?.receipt && <label className="check"><input type="checkbox" name="fjernBilag" /> <span>Fjern det nuværende <a href={e.receipt} target="_blank" rel="noopener">bilag</a></span></label>}
          <p className="muted small" style={{ margin: 0 }}>Kontingent betalt med kort kommer automatisk med. Skriv kun kontant eller bankoverførsel her.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="button" type="submit">{e ? "Gem ændringer" : "Tilføj postering"}</button>
            {e && <Link href={q({ ret: null })} className="button ghost">Annullér</Link>}
          </div>
        </form>
      </section>

      <YearPicker year={year} path="/posteringer" />
      <p className="filters">
        <Link href={q({ vis: null, kategori: null })} className={!vis && !kategori ? "active" : undefined}>Alle</Link>
        <Link href={q({ vis: "INCOME", kategori: null })} className={vis === "INCOME" ? "active" : undefined}>Indtægter</Link>
        <Link href={q({ vis: "EXPENSE", kategori: null })} className={vis === "EXPENSE" ? "active" : undefined}>Udgifter</Link>
        {kategori && <span className="active">{CATEGORY[kategori].label} <Link href={q({ kategori: null })} aria-label="Fjern filter">✕</Link></span>}
      </p>

      <div className="table-scroll">
        <table className="list finance-list">
          <thead><tr><th>Bilag</th><th>Dato</th><th>Tekst</th><th>Kategori</th><th className="num">Beløb</th><th /></tr></thead>
          <tbody>
            {entries.map((x) => (
              <tr key={x.id}>
                <td>{x.receipt ? <a href={x.receipt} target="_blank" rel="noopener" title="Se bilag">{x.voucherNo} 📎</a> : x.voucherNo}</td>
                <td>{dato(x.date)}</td>
                <td>{x.text}{(x.counterparty || x.sponsor) && <small className="muted"> · {x.counterparty ?? x.sponsor?.name}</small>}</td>
                <td><Link href={q({ kategori: x.category, vis: null })}>{CATEGORY[x.category]?.label ?? x.category}</Link></td>
                <td className={`num ${x.kind === "EXPENSE" ? "neg" : ""}`}>{x.kind === "EXPENSE" ? "−" : ""}{kr(x.amountOre)}</td>
                <td className="actions">
                  <Link href={q({ ret: x.id }) + "#ny"}>Ret</Link>
                  <details className="confirm-del"><summary>Slet</summary><form action={deleteEntry}><input type="hidden" name="id" value={x.id} /><button className="button danger small" type="submit">Slet bilag {x.voucherNo}</button></form></details>
                </td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={6} className="muted">Ingen posteringer {kategori || vis ? "med det filter " : ""}i {year}.</td></tr>}
          </tbody>
          <tfoot>
            <tr><th colSpan={4}>Posteringer i alt</th><th className={`num ${sum < 0 ? "neg" : ""}`}>{kr(sum)}</th><th /></tr>
            {feeSum > 0 && <tr><td colSpan={4} className="muted">+ kontingent betalt med kort ({fees.length} betalinger, se <Link href="/admin/betalinger">Betalinger</Link>)</td><td className="num">{kr(feeSum)}</td><td /></tr>}
          </tfoot>
        </table>
      </div>
    </>
  );
}
