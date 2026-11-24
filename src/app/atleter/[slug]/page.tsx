import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { VISIBLE_ATHLETE, instagramUrl, lines } from "@/lib/athletes";
import { AthletePhoto } from "@/components/AthleteCard";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  return prisma.athleteProfile.findFirst({
    where: { slug, ...VISIBLE_ATHLETE },
    include: { user: { select: { name: true } }, sponsors: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await load((await params).slug);
  return a ? { title: a.user.name ?? "Atlet", description: a.headline ?? undefined } : {};
}

export default async function AthletePage({ params }: Props) {
  const a = await load((await params).slug);
  if (!a) notFound();
  const name = a.user.name ?? "Atlet";
  const ig = instagramUrl(a.instagram);
  const goals = lines(a.goals);
  const results = lines(a.results);
  const mail = `mailto:nyborgtri@gmail.com?subject=${encodeURIComponent(`Sponsorat af ${name}`)}`;

  return (
    <article className="athlete-page">
      <p><Link href="/atleter">← Alle atleter</Link></p>
      <header className="athlete-head">
        <AthletePhoto a={a} className="athlete-photo" />
        <div>
          <p className="eyebrow">Nyborg Triathlon Klub · Elite</p>
          <h1>{name}</h1>
          {a.headline && <p className="lead">{a.headline}</p>}
          {ig && <p><a href={ig} target="_blank" rel="noopener">Følg på Instagram</a></p>}
        </div>
      </header>

      {a.bio && <section className="content athlete-bio">{a.bio.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</section>}

      <div className="athlete-cols">
        {goals.length > 0 && (
          <section className="card">
            <h2>Mål for sæsonen</h2>
            <ul className="lp-checks">{goals.map((g) => <li key={g}>{g}</li>)}</ul>
          </section>
        )}
        {results.length > 0 && (
          <section className="card">
            <h2>Resultater</h2>
            <ul className="athlete-results">{results.map((r) => <li key={r}>{r}</li>)}</ul>
          </section>
        )}
      </div>

      <section className="athlete-sponsors card">
        <h2>{a.sponsors.length ? `${name.split(" ")[0]} støttes af` : `Bliv ${name.split(" ")[0]}s første sponsor`}</h2>
        {a.sponsors.length > 0 && (
          <ul>
            {a.sponsors.map((s) => (
              <li key={s.id}>{s.url ? <a href={s.url} target="_blank" rel="noopener"><img src={s.logo} alt={s.name} /></a> : <img src={s.logo} alt={s.name} />}</li>
            ))}
          </ul>
        )}
        <p className="muted">Vil din virksomhed støtte {name.split(" ")[0]} og få jeres navn med til løb hele sæsonen?</p>
        <a href={mail} className="button">Kontakt os om sponsorat</a>
      </section>
    </article>
  );
}
