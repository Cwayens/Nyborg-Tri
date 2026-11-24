import Link from "next/link";
import type { AthleteGroup } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { DISCIPLINE_LABEL, GROUP_LABEL, GROUPS, trainingVisibleFor } from "@/lib/roles";
import { dayKey, formatDay, formatTime } from "@/lib/time";

export const metadata = { title: "Kalender" };

type Props = { searchParams: Promise<{ gruppe?: string; uger?: string }> };

export default async function Calendar({ searchParams }: Props) {
  const sp = await searchParams;
  const session = await auth();
  const own = session?.user.athleteGroup ?? null;
  // Atleter ser som standard deres egen gruppe; "alle" viser alt
  const group: AthleteGroup | null =
    sp.gruppe === "alle" ? null : GROUPS.includes(sp.gruppe as AthleteGroup) ? (sp.gruppe as AthleteGroup) : own;
  const weeks = Math.min(12, Math.max(1, Number(sp.uger) || 4));

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + weeks * 7 * 24 * 3600 * 1000);
  const sessions = (
    await prisma.trainingSession.findMany({
      where: { startsAt: { gte: from, lt: to } },
      include: { createdBy: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
    })
  ).filter((s) => trainingVisibleFor(s.groups, group));

  const days = new Map<string, typeof sessions>();
  for (const s of sessions) days.set(dayKey(s.startsAt), [...(days.get(dayKey(s.startsAt)) ?? []), s]);

  const link = (g: string) => `/kalender?gruppe=${g}&uger=${weeks}`;
  return (
    <>
      <h1>Kalender</h1>
      <p className="filters">
        <span className="muted">Vis:</span>
        <Link href={link("alle")} className={group === null ? "active" : undefined}>Alle</Link>
        {GROUPS.map((g) => (
          <Link key={g} href={link(g)} className={group === g ? "active" : undefined}>
            {GROUP_LABEL[g]}{own === g ? " (min gruppe)" : ""}
          </Link>
        ))}
      </p>

      {days.size === 0 && <p className="muted">Ingen træninger de næste {weeks} uger.</p>}
      {[...days.entries()].map(([key, list]) => (
        <section key={key} className="day">
          <h2>{formatDay(list[0].startsAt)}</h2>
          {list.map((s) => (
            <article key={s.id} className="card training">
              <div className="training-time">
                {formatTime(s.startsAt)}–{formatTime(s.endsAt)}
              </div>
              <div>
                <span className="tag">{DISCIPLINE_LABEL[s.discipline]}</span>
                <h3>{s.title}</h3>
                <p className="muted">
                  {s.location}
                  {s.createdBy.name ? ` · Træner: ${s.createdBy.name}` : ""}
                  {" · "}
                  {s.groups.length === 0 ? "Alle grupper" : s.groups.map((g) => GROUP_LABEL[g]).join(", ")}
                </p>
                {s.description && <p style={{ whiteSpace: "pre-line" }}>{s.description}</p>}
              </div>
            </article>
          ))}
        </section>
      ))}
      {weeks < 12 && (
        <p><Link href={`/kalender?gruppe=${group ?? "alle"}&uger=${weeks + 4}`}>Vis flere uger →</Link></p>
      )}
    </>
  );
}
