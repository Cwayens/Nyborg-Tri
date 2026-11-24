import type { Discipline } from "@prisma/client";
import { dato } from "@/lib/format";
import { videoEmbed } from "@/lib/video";
import { DisciplineIcon } from "./Icons";
import { deleteTip } from "@/app/tips/actions";

export function TipCard({ tip, latest, canDelete }: {
  tip: { id: string; title: string; body: string; discipline: Discipline | null; videoUrl: string | null; publishedAt: Date; author: { name: string | null } };
  latest?: boolean; canDelete?: boolean;
}) {
  const embed = videoEmbed(tip.videoUrl);
  return (
    <article className={`card tip${tip.discipline ? ` disc disc-${tip.discipline}` : ""}`}>
      <header>
        {tip.discipline && <DisciplineIcon discipline={tip.discipline} />}
        <div>
          {latest && <span className="pill test-pill" style={{ marginLeft: 0 }}>Ugens tip</span>}
          <h2 className="h3" style={{ margin: "2px 0" }}>{tip.title}</h2>
          <small className="muted">{tip.author.name ?? "Træner"} · {dato(tip.publishedAt)}</small>
        </div>
      </header>
      {embed && (
        <div className="video">
          <iframe src={embed} title={tip.title} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        </div>
      )}
      <p style={{ whiteSpace: "pre-line" }}>{tip.body}</p>
      {canDelete && (
        <form action={deleteTip}><input type="hidden" name="id" value={tip.id} /><button className="linklike" type="submit">Slet</button></form>
      )}
    </article>
  );
}
