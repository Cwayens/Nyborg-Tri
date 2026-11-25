import Link from "next/link";
import { requireAdmin } from "@/auth";
import { AdminNav } from "@/components/AdminNav";
import { prisma } from "@/lib/db";
import { FIELD_LABEL, type ImportField, type ImportRow } from "@/lib/member-import";
import { matchTeam } from "@/lib/teams";
import { getTeams } from "@/lib/visibility";
import { cancelImport, previewImport, runImport } from "./actions";

export const metadata = { title: "Admin – importér medlemmer" };

type Props = { searchParams: Promise<{ vis?: string; fejl?: string; oprettet?: string; sprunget?: string; medlemskaber?: string }> };

export default async function ImportMembers({ searchParams }: Props) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const saved = sp.vis ? await prisma.setting.findUnique({ where: { key: `import_preview_${admin.id}` } }) : null;
  const data = saved?.value as { rows: ImportRow[]; mapped: ImportField[]; name: string } | undefined;
  const teams = await getTeams();
  const teamOf = (r: ImportRow) => (r.groupText && matchTeam(r.groupText, teams)) || (r.group && teams.find((t) => t.active && t.kind === r.group)) || null;
  const ok = data?.rows.filter((r) => !r.errors.length) ?? [];
  const bad = data?.rows.filter((r) => r.errors.length) ?? [];
  const known = data ? new Set((await prisma.user.findMany({ where: { email: { in: ok.map((r) => r.email) } }, select: { email: true } })).map((u) => u.email.toLowerCase())) : new Set<string>();

  return (
    <>
      <h1>Importér medlemmer</h1>
      <AdminNav />
      {sp.fejl && <p className="status-warn">{sp.fejl}</p>}
      {sp.oprettet && (
        <p className="notice">
          {sp.oprettet} medlemmer oprettet{Number(sp.medlemskaber) ? `, heraf ${sp.medlemskaber} med betalt medlemskab` : ""}.
          {Number(sp.sprunget) ? ` ${sp.sprunget} fandtes allerede og blev ikke rørt.` : ""} <Link href="/admin">Se medlemmerne</Link>
        </p>
      )}

      {!data ? (
        <section className="card stack admin-form">
          <p style={{ margin: 0 }}>
            Hent medlemslisten fra Excel eller jeres gamle system (fx Conventus, Klubmodul eller Holdsport) og gem den som <b>CSV</b>. I Excel:
            Filer → Gem som → CSV (semikolonsepareret). Første række skal være overskrifter.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            Kolonner, der genkendes: navn (eller fornavn og efternavn), mail, telefon, fødselsdato, adresse, postnr., by, gruppe/hold,
            medlemstype og &quot;betalt til&quot;. Kun navn og mail er påkrævet. Har en række medlemstype og en &quot;betalt til&quot;-dato
            i fremtiden, får medlemmet et medlemskab til den dato. Ellers kan medlemmet selv betale, når de logger ind.
          </p>
          <form action={previewImport} encType="multipart/form-data" className="row" style={{ alignItems: "flex-end" }}>
            <label>Fil<input type="file" name="file" accept=".csv,text/csv,.txt" required /></label>
            <button className="button" type="submit">Vis først</button>
          </form>
          <p className="muted small" style={{ margin: 0 }}>Ingen får mail ved importen. Medlemmerne logger ind med deres mail, når I fortæller dem om den nye side.</p>
        </section>
      ) : (
        <section className="stack">
          <p>
            <b>{data.name}</b>: {ok.length} klar til import{known.size ? `, heraf ${known.size} der allerede findes (de springes over)` : ""}.
            {bad.length ? ` ${bad.length} rækker har fejl og bliver ikke importeret.` : ""}
          </p>
          <p className="muted">Genkendte kolonner: {data.mapped.map((f) => FIELD_LABEL[f]).join(", ")}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <form action={runImport}><button className="button" type="submit" disabled={ok.length - known.size <= 0}>Importér {ok.length - known.size} medlemmer</button></form>
            <form action={cancelImport}><button className="button ghost" type="submit">Annullér</button></form>
          </div>
          {bad.length > 0 && (
            <div className="card">
              <h2 className="h3" style={{ marginTop: 0 }}>Rækker med fejl</h2>
              <ul>{bad.slice(0, 50).map((r) => <li key={r.line}>Række {r.line}{r.name ? ` (${r.name})` : ""}: {r.errors.join(", ")}</li>)}</ul>
            </div>
          )}
          <div className="table-scroll">
            <table className="list">
              <thead><tr><th>Navn</th><th>Mail</th><th>Hold</th><th>Medlemstype</th><th>Betalt til</th><th></th></tr></thead>
              <tbody>
                {ok.slice(0, 200).map((r) => (
                  <tr key={r.line}>
                    <td>{r.name}</td><td>{r.email}</td><td>{teamOf(r)?.label ?? "–"}</td><td>{r.type ?? "–"}</td><td>{r.paidUntil ?? "–"}</td>
                    <td>{known.has(r.email) ? <span className="pill">Findes</span> : <span className="pill ok">Ny</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ok.length > 200 && <p className="muted" style={{ padding: "0 12px" }}>… og {ok.length - 200} mere</p>}
          </div>
        </section>
      )}
    </>
  );
}
