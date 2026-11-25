import { requireTeamStaff } from "@/lib/staff";
import { prisma } from "@/lib/db";
import { audienceLabel, audiencesFor, recipients } from "@/lib/bulkmail";
import { sendGroupMail } from "./actions";
import { requireFeature } from "@/lib/features";

export const metadata = { title: "Mail til medlemmer" };
export const maxDuration = 60;

type Props = { searchParams: Promise<{ fejl?: string; test?: string; sendt?: string; fejlede?: string }> };

export default async function MailPage({ searchParams }: Props) {
  await requireFeature("mail");
  const user = await requireTeamStaff("/admin/mail");
  const sp = await searchParams;
  const allowed = await audiencesFor(user);
  const counts = await Promise.all(allowed.map(async (a) => [(await recipients(a.value, "IMPORTANT")).length, (await recipients(a.value, "NEWS")).length] as const));
  const log = await prisma.mailLog.findMany({ where: user.role === "ATHLETE" ? { audience: { in: allowed.map((a) => a.value) } } : {}, orderBy: { createdAt: "desc" }, take: 20 });
  const labels = new Map(await Promise.all([...new Set(log.map((m) => m.audience))].map(async (v) => [v, await audienceLabel(v)] as const)));
  return (
    <>
      <h1>Mail til medlemmer</h1>
      <p className="muted">
        Skriv til et hold, alle medlemmer eller trænerne. Hver modtager får sin egen mail, så ingen kan se de andres adresser. Mails til børn sendes
        til deres forælder eller værge.
      </p>
      {sp.fejl && <p className="status-warn">{sp.fejl}</p>}
      {sp.test && <p className="notice">Testmailen er sendt til dig.</p>}
      {sp.sendt && <p className="notice">Mailen er sendt til {sp.sendt} modtagere{Number(sp.fejlede) > 0 ? `. ${sp.fejlede} kunne ikke sendes, tjek mailserveren under Drift.` : "."}</p>}

      <form action={sendGroupMail} className="card stack mail-form">
        <div className="row2">
          <label>Modtagere
            <select name="audience" required defaultValue="">
              <option value="" disabled>Vælg</option>
              {allowed.map((a, i) => <option key={a.value} value={a.value}>{a.label} ({counts[i][0]})</option>)}
            </select>
          </label>
          <label>Type
            <select name="kind" defaultValue="NEWS">
              <option value="NEWS">Nyhed (kun dem, der vil have nyheder)</option>
              <option value="IMPORTANT">Vigtig besked, fx aflysning (alle)</option>
            </select>
          </label>
        </div>
        <label>Emne<input name="subject" required maxLength={150} placeholder="fx Svømning er aflyst torsdag" /></label>
        <label>Besked<textarea name="body" required rows={8} maxLength={10000} /></label>
        <p className="muted small" style={{ margin: 0 }}>Mailen slutter med &quot;Venlig hilsen {user.name}&quot;. Nyheder får et link til at framelde nyheder.</p>
        <label className="check"><input type="checkbox" name="confirm" /> Ja, send mailen nu</label>
        <div className="about-actions">
          <button className="button" type="submit" name="intent" value="send">Send</button>
          <button className="button secondary" type="submit" name="intent" value="test" formNoValidate={false}>Send en test til mig selv</button>
        </div>
        <p className="muted small" style={{ margin: 0 }}>Tal i parentes er antal modtagere af vigtige beskeder. Nyheder går kun til dem, der ikke har frameldt dem.</p>
      </form>

      <h2>Sendt</h2>
      {log.length === 0 ? <p className="card empty">Der er ikke sendt nogen mails endnu.</p> : (
        <div className="table-scroll">
          <table className="list">
            <thead><tr><th>Dato</th><th>Emne</th><th>Til</th><th>Modtagere</th><th>Afsender</th></tr></thead>
            <tbody>
              {log.map((m) => (
                <tr key={m.id}>
                  <td>{m.createdAt.toLocaleString("da-DK", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Copenhagen" })}</td>
                  <td>{m.subject}{m.kind === "IMPORTANT" && <span className="pill" style={{ marginLeft: 6 }}>Vigtig</span>}</td>
                  <td>{labels.get(m.audience)}</td>
                  <td>{m.recipients}{m.failed > 0 && <span className="status-warn-text"> ({m.failed} fejlede)</span>}</td>
                  <td>{m.sentByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
