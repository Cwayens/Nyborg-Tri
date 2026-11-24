import Link from "next/link";
import type { AthleteGroup } from "@prisma/client";
import { auth, requireUser } from "@/auth";
import { canSignUp } from "@/lib/access";
import { prisma } from "@/lib/db";
import { DISCIPLINE_LABEL, GROUP_LABEL, GROUPS, canJoinGroup, trainingVisibleFor } from "@/lib/roles";
import { dayKey, formatDay, formatTime } from "@/lib/time";
import { toggleSignup } from "./actions";

export const metadata = { title: "Kalender" };

type Props = { searchParams: Promise<{ gruppe?: string; uger?: string }> };

export default async function Calendar({ searchParams }: Props) {
  await requireUser("/kalender");
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
      include: {
        createdBy: { select: { name: true } },
        signups: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { startsAt: "asc" },
    })
  ).filter((s) => trainingVisibleFor(s.group, group));

  const days = new Map<string, typeof sessions>();
  for (const s of sessions) days.set(dayKey(s.startsAt), [...(days.get(dayKey(s.startsAt)) ?? []), s]);

  const userId = session?.user.id ?? null;
  const eligible = userId ? await canSignUp(userId) : false;

  const link = (g: string) => `/kalender?gruppe=${g}&uger=${weeks}`;
  return (
    <>
      <div className="section-head" style={{ marginTop: 0 }}>
        <h1 style={{ margin: 0 }}>Kalender</h1>
        {userId && <Link href="/forbindelser" className="muted">Få kalenderen på telefonen →</Link>}
      </div>
      <p className="filters">
        <span className="muted">Vis:</span>
        <Link href={link("alle")} className={group === null ? "active" : undefined}>Alle</Link>
        {GROUPS.map((g) => (
          <Link key={g} href={link(g)} className={group === g ? "active" : undefined}>
            {GROUP_LABEL[g]}{own === g ? " (min gruppe)" : ""}
          </Link>
        ))}
      </p>

      {!userId && (
        <p className="card">
          <Link href="/login?callbackUrl=/kalender">Log ind</Link> for at tilmelde dig træninger og se hvem der kommer.
        </p>
      )}
      {userId && !eligible && (
        <p className="card">
          Du kan tilmelde dig træninger, når du har betalt kontingent, fået en prøveperiode eller brugt en kode.{" "}
          <Link href="/bliv-medlem">Se mulighederne</Link>
        </p>
      )}

      {userId && eligible && !own && session!.user.role === "ATHLETE" && (
        <p className="card">Du er endnu ikke tilknyttet en gruppe (Elite, Bredde eller Børn). Kontakt bestyrelsen, så du kan tilmelde dig træninger.</p>
      )}

      {days.size === 0 && <p className="muted">Ingen træninger de næste {weeks} uger.</p>}
      {[...days.entries()].map(([key, list]) => (
        <section key={key} className="day">
          <h2>{formatDay(list[0].startsAt)}</h2>
          {list.map((s) => (
            <article key={s.id} className={`card training disc disc-${s.discipline}`}>
              <div className="training-time">
                {formatTime(s.startsAt)}–{formatTime(s.endsAt)}
              </div>
              <div>
                <span className="disc-label">{DISCIPLINE_LABEL[s.discipline]}</span>
                <h3 style={s.cancelledAt ? { textDecoration: "line-through" } : undefined}>{s.title}</h3>
                {s.cancelledAt && <p><span className="pill warn">Aflyst{s.cancelReason ? `: ${s.cancelReason}` : ""}</span></p>}
                <p className="muted">
                  {s.location}
                  {s.createdBy.name ? ` · Træner: ${s.createdBy.name}` : ""}
                  {" · "}
                  {GROUP_LABEL[s.group]}
                </p>
                {s.description && <p style={{ whiteSpace: "pre-line" }}>{s.description}</p>}
                <Attendees names={userId ? s.signups.map((x) => x.user.name ?? "Unavngivet") : null} count={s.signups.length} />
              </div>
              {userId && !s.cancelledAt && s.startsAt > new Date() && (s.signups.some((x) => x.user.id === userId) || (eligible && canJoinGroup(session!.user, s.group))) && (
                <form action={toggleSignup} className="signup">
                  <input type="hidden" name="sessionId" value={s.id} />
                  {s.signups.some((x) => x.user.id === userId) ? (
                    <button className="button secondary small" type="submit">✓ Tilmeldt · Afmeld</button>
                  ) : (
                    <button className="button small" type="submit">Tilmeld</button>
                  )}
                </form>
              )}
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

// Navne vises kun for indloggede; andre ser kun antallet
function Attendees({ names, count }: { names: string[] | null; count: number }) {
  if (count === 0) return <p className="muted attendees">Ingen tilmeldte endnu</p>;
  return (
    <p className="attendees">
      <strong>{count} kommer</strong>
      {names && <span className="muted">: {names.join(", ")}</span>}
    </p>
  );
}
