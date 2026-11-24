import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/auth";
import { AdminNav } from "@/components/AdminNav";
import { prisma } from "@/lib/db";
import { listBackups } from "@/lib/backup";
import { sendMail } from "@/lib/mail";
import { blobEnabled } from "@/lib/upload";
import { CLUB } from "@/lib/club";

export const metadata = { title: "Admin – drift" };

async function testAlert() {
  "use server";
  const admin = await requireAdmin();
  const to = process.env.ALERT_EMAIL;
  if (to) await sendMail(to, `[${CLUB.shortName}] Testmail fra overvågningen`, `Overvågningen virker. Sendt af ${admin.email} fra Admin → Drift.`);
  revalidatePath("/admin/drift");
}

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <li className={ok ? "status-ok" : "status-warn-text"}>{ok ? "✓" : "✗"} {children}</li>;
}

export default async function Drift() {
  await requireAdmin();
  const t = Date.now();
  let dbOk = true;
  try { await prisma.$queryRaw`SELECT 1`; } catch { dbOk = false; }
  const dbMs = Date.now() - t;
  const backups = await listBackups().catch(() => []);
  const newest = backups[0];
  const fresh = !!newest && Date.now() - newest.uploadedAt.getTime() < 36 * 3600_000;
  const env = (k: string) => !!process.env[k];
  return (
    <>
      <h1>Drift</h1>
      <AdminNav />
      <div className="grid" style={{ marginBottom: 20 }}>
        <div className="card"><strong style={{ fontSize: "1.6rem" }}>{dbOk ? "Kører" : "Fejl"}</strong><br /><span className="muted">database ({dbMs} ms)</span></div>
        <div className="card"><strong style={{ fontSize: "1.6rem" }}>{newest ? newest.uploadedAt.toLocaleDateString("da-DK", { timeZone: "Europe/Copenhagen" }) : "Ingen"}</strong><br /><span className="muted">seneste backup ({backups.length} gemt)</span></div>
      </div>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Opsætning</h2>
        <ul className="drift-list">
          <Check ok={fresh}>Backup inden for det seneste døgn (kører hver nat kl. 3)</Check>
          <Check ok={env("BACKUP_KEY")}>BACKUP_KEY sat (krypterer backupfilerne)</Check>
          <Check ok={blobEnabled()}>Billedlager (BLOB_READ_WRITE_TOKEN) sat</Check>
          <Check ok={env("CRON_SECRET")}>CRON_SECRET sat (natlige job)</Check>
          <Check ok={env("ALERT_EMAIL")}>ALERT_EMAIL sat (mail ved fejl)</Check>
          <Check ok={env("EMAIL_SERVER")}>Mailserver sat</Check>
        </ul>
        <p className="muted">
          Oppetid: opret en gratis overvågning (fx UptimeRobot), der kalder <code>/api/health</code> hvert 5. minut og mailer, hvis siden er nede.
          Gendannelse: brug først Neons egen gendannelse til et tidspunkt. Backupfilerne er reserven (se README).
        </p>
        <form action={testAlert}><button className="button small secondary" type="submit" disabled={!env("ALERT_EMAIL")}>Send testmail til ALERT_EMAIL</button></form>
      </section>
    </>
  );
}
