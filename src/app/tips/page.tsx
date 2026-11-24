import Link from "next/link";
import type { Discipline } from "@prisma/client";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { requireFeature } from "@/lib/features";
import { DISCIPLINE_LABEL, hasRole } from "@/lib/roles";
import { TipCard } from "@/components/TipCard";
import { createTip } from "./actions";

export const metadata = { title: "Ugens tip" };

type Props = { searchParams: Promise<{ ny?: string; fejl?: string; gemt?: string; sport?: string }> };

export default async function Tips({ searchParams }: Props) {
  const user = await requireUser("/tips");
  await requireFeature("tips");
  const { ny, fejl, gemt, sport } = await searchParams;
  const trainer = hasRole(user.role, "TRAINER");
  const filter = (["SWIM", "BIKE", "RUN"] as Discipline[]).includes(sport as Discipline) ? (sport as Discipline) : null;
  const tips = await prisma.tip.findMany({
    where: filter ? { discipline: filter } : {},
    include: { author: { select: { name: true } } },
    orderBy: { publishedAt: "desc" },
    take: 40,
  });

  return (
    <>
      <div className="section-head" style={{ marginTop: 0 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Ugens tip</h1>
          <p className="muted" style={{ margin: 0 }}>Korte tips og videoer fra trænerne om teknik, skift og træning.</p>
        </div>
        {trainer && !ny && <Link href="/tips?ny=1" className="button">+ Nyt tip</Link>}
      </div>
      {gemt && <p className="notice">Tippet er lagt ud.</p>}
      {fejl && <p className="status-warn">{fejl}</p>}

      {trainer && ny && (
        <form action={createTip} className="card stack" style={{ marginBottom: 20 }}>
          <label>Overskrift<input name="title" required maxLength={100} placeholder="fx Sådan sigter du i åbent vand" /></label>
          <div className="row">
            <label>Sport
              <select name="discipline" defaultValue="">
                <option value="">Generelt</option>
                {(["SWIM", "BIKE", "RUN", "STRENGTH"] as const).map((d) => <option key={d} value={d}>{DISCIPLINE_LABEL[d]}</option>)}
              </select>
            </label>
            <label>Video (YouTube eller Vimeo, valgfrit)<input name="videoUrl" type="url" placeholder="https://youtu.be/…" /></label>
          </div>
          <label>Tippet<textarea name="body" required style={{ minHeight: 120 }} placeholder="Løft hovedet let frem hvert 6.-8. tag, find et fast punkt, og sænk det igen…" /></label>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="button" type="submit">Læg ud</button>
            <Link href="/tips" className="button ghost">Annullér</Link>
          </div>
        </form>
      )}

      <p className="filters">
        <Link href="/tips" className={!filter ? "active" : undefined}>Alle</Link>
        {(["SWIM", "BIKE", "RUN"] as const).map((d) => <Link key={d} href={`/tips?sport=${d}`} className={filter === d ? "active" : undefined}>{DISCIPLINE_LABEL[d]}</Link>)}
      </p>

      {tips.length === 0 && <p className="card empty">Ingen tips endnu.{trainer ? " Læg det første ud!" : ""}</p>}
      <div className="tips">
        {tips.map((t, i) => <TipCard key={t.id} tip={t} latest={i === 0 && !filter} canDelete={trainer} />)}
      </div>
    </>
  );
}
