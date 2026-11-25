import type { Discipline } from "@prisma/client";
import { DisciplineIcon, PinIcon, initials } from "./Icons";
import { disciplineLabel } from "@/lib/roles";
import { translator, type Locale } from "@/lib/i18n-core";
import { formatDay, formatTime } from "@/lib/time";
import { cancelWorkout, toggleJoin } from "@/app/traen-sammen/actions";
import { WorkoutView as ProgramView } from "./WorkoutView";
import { isWorkout, type References } from "@/lib/workout";

export type WorkoutView = {
  id: string; discipline: Discipline; title: string; location: string; startsAt: Date; durationMin: number;
  level: string | null; description: string | null; maxPeople: number | null; hostId: string;
  workout?: unknown; host: { name: string | null }; participants: { user: { id: string; name: string | null } }[];
};

export function WorkoutCard({ w, userId, canJoin, refs, loc = "da" }: { w: WorkoutView; userId: string; canJoin: boolean; refs?: References | null; loc?: Locale }) {
  const t = translator(loc);
  const joined = w.participants.some((p) => p.user.id === userId);
  const full = !!w.maxPeople && w.participants.length >= w.maxPeople;
  const isHost = w.hostId === userId;
  return (
    <article className={`card training disc disc-${w.discipline}`}>
      <DisciplineIcon discipline={w.discipline} />
      <div>
        <span className="disc-label">{disciplineLabel(w.discipline, loc)}{w.level ? ` · ${w.level}` : ""}{isWorkout(w.workout) ? t(" · Med program", " · With workout") : ""}</span>
        <h3>{w.title}</h3>
        <p className="muted">
          {formatDay(w.startsAt, loc)} {t("kl.", "at")} {formatTime(w.startsAt, loc)} · {w.durationMin} min
          <br /><PinIcon /> {w.location} · {t("Slået op af", "Posted by")} {isHost ? t("dig", "you") : w.host.name ?? t("et medlem", "a member")}
        </p>
        {w.description && <p style={{ whiteSpace: "pre-line" }}>{w.description}</p>}
        {isWorkout(w.workout) && (
          <ProgramView workout={w.workout} discipline={w.discipline} refs={refs ?? null} downloadId={joined ? w.id : undefined} kind="tur" />
        )}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6 }}>
          <span className="avatars">
            {w.participants.slice(0, 6).map((p) => <span key={p.user.id} className="avatar" title={p.user.name ?? ""}>{initials(p.user.name)}</span>)}
          </span>
          <span className="muted" style={{ fontSize: "0.9rem" }}>
            {w.participants.length}{w.maxPeople ? ` ${t("af", "of")} ${w.maxPeople}` : ""} {t("med", "going")}: {w.participants.map((p) => p.user.name ?? "?").join(", ")}
          </span>
        </div>
      </div>
      <div className="signup">
        {isHost ? (
          <form action={cancelWorkout}><input type="hidden" name="id" value={w.id} /><button className="button ghost small" type="submit">{t("Aflys", "Cancel")}</button></form>
        ) : joined ? (
          <form action={toggleJoin}><input type="hidden" name="id" value={w.id} /><button className="button secondary small" type="submit">{t("✓ Med · Afmeld", "✓ Going · Leave")}</button></form>
        ) : canJoin && !full ? (
          <form action={toggleJoin}><input type="hidden" name="id" value={w.id} /><button className="button small" type="submit">{t("Jeg er med", "I'm in")}</button></form>
        ) : full ? <span className="pill">{t("Fuld", "Full")}</span> : null}
      </div>
    </article>
  );
}
