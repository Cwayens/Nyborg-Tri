import Link from "next/link";
import { prisma } from "@/lib/db";
import { VISIBLE_ATHLETE } from "@/lib/athletes";
import { AthleteCard } from "@/components/AthleteCard";
import { requireFeature } from "@/lib/features";

export const metadata = {
  title: "Atleter",
  description: "Mød Nyborg Triathlon Klubs elite-atleter, og se hvordan din virksomhed kan støtte dem.",
};

const CONTACT = "nyborgtri@gmail.com";

export default async function Athletes() {
  await requireFeature("atleter");
  const athletes = await prisma.athleteProfile.findMany({
    where: VISIBLE_ATHLETE,
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
    include: { user: { select: { name: true } } },
  });
  const mail = `mailto:${CONTACT}?subject=${encodeURIComponent("Sponsorat af atlet i Nyborg Triathlon Klub")}`;

  return (
    <div className="athletes">
      <header className="athletes-hero">
        <p className="eyebrow">Elite</p>
        <h1>Klubbens atleter</h1>
        <p className="lead">
          De træner hårdt for at komme på podiet til DM, Ironman og internationale løb. Følg dem gennem sæsonen, og bliv en del af rejsen som sponsor.
        </p>
      </header>

      {athletes.length === 0 ? (
        <div className="card empty">Atletprofilerne er på vej. Kig forbi igen snart.</div>
      ) : (
        <div className="athlete-grid">
          {athletes.map((a) => <AthleteCard key={a.id} a={a} />)}
        </div>
      )}

      <section className="sponsor-pitch card">
        <div>
          <h2>Støt en atlet, og bliv set</h2>
          <p>
            Som atletsponsor kommer dit logo på atletens profil her på siden og i sponsorbjælken på forsiden. Atleten bærer dit navn til løb og deler
            sæsonen på sociale medier. Pakken aftales med klubben, så den passer til jer.
          </p>
          <ul className="lp-checks">
            <li>Logo på atletens profil og på klubbens forside</li>
            <li>Omtale i klubbens nyheder og på Facebook ved store resultater</li>
            <li>Mulighed for logo på konkurrencedragt og klubtøj</li>
          </ul>
        </div>
        <a href={mail} className="button big">Kontakt os om sponsorat</a>
      </section>
      <p className="muted" style={{ marginTop: 16 }}>Vil du hellere støtte hele klubben? Se <Link href="/sponsorer">vores sponsorer</Link>.</p>
    </div>
  );
}
