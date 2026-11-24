import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { requireFeature } from "@/lib/features";
import { CLUB } from "@/lib/club";

export const metadata = { title: "Sponsorer", description: `Virksomhederne bag ${CLUB.name}, og de fordele medlemmerne får.` };

export default async function Sponsors() {
  await requireFeature("sponsorer");
  const member = !!(await auth())?.user;
  const sponsors = await prisma.sponsor.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const mail = `mailto:${CLUB.email}?subject=${encodeURIComponent(`Sponsorat af ${CLUB.name}`)}`;

  return (
    <>
      <header className="athletes-hero">
        <p className="eyebrow">Tak for støtten</p>
        <h1>Vores sponsorer</h1>
        <p className="lead">Disse virksomheder gør det muligt for os at holde kontingentet lavt og arrangere stævner. Flere giver rabat til klubbens medlemmer.</p>
      </header>

      <div className="sponsor-grid">
        {sponsors.map((s) => (
          <article key={s.id} className="sponsor-card">
            <div className="sponsor-logo">
              {s.url ? <a href={s.url} target="_blank" rel="noopener"><img src={s.logo} alt={s.name} /></a> : <img src={s.logo} alt={s.name} />}
            </div>
            <div className="sponsor-body">
              <h2>{s.name}</h2>
              {s.discount && <span className="pill ok sponsor-discount">Medlemsfordel: {s.discount}</span>}
              {s.description && <p className="muted">{s.description}</p>}
              {s.details && (member ? (
                <details className="sponsor-details">
                  <summary>Adresse og detaljer</summary>
                  <p>{s.details}</p>
                </details>
              ) : s.discount ? (
                <p className="muted sponsor-login"><Link href="/login?callbackUrl=/sponsorer">Log ind</Link> for at se, hvordan du får rabatten.</p>
              ) : null)}
              {s.url && <a href={s.url} target="_blank" rel="noopener" className="sponsor-link">Besøg {s.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")} →</a>}
            </div>
          </article>
        ))}
      </div>

      <section className="sponsor-pitch card">
        <div>
          <h2>Bliv sponsor</h2>
          <p>Få jeres logo på forsiden, på klubtøjet og ved NyborgTri Cup og Nyborg MiniTri. Eller støt en af <Link href="/atleter">klubbens atleter</Link>.</p>
        </div>
        <a href={mail} className="button big">Kontakt os</a>
      </section>
    </>
  );
}
