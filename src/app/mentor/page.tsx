import { requireMember } from "@/auth";
import { prisma } from "@/lib/db";
import { requireFeature } from "@/lib/features";
import { hasRole } from "@/lib/roles";
import { dato } from "@/lib/format";
import { initials } from "@/components/Icons";
import { endMentorship, requestMentor, setMentor } from "./actions";

export const metadata = { title: "Mentorordning" };

const contact = { name: true, email: true, phone: true } as const;

export default async function Mentor({ searchParams }: { searchParams: Promise<{ fejl?: string; ny?: string }> }) {
  const user = await requireMember("/mentor");
  await requireFeature("mentor");
  const { fejl, ny } = await searchParams;
  const [me, mine, mentees, mentorCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { mentor: true } }),
    prisma.mentorship.findUnique({ where: { menteeId: user.id }, include: { mentor: { select: contact } } }),
    prisma.mentorship.findMany({ where: { mentorId: user.id }, include: { mentee: { select: contact } }, orderBy: { createdAt: "desc" } }),
    prisma.user.count({ where: { mentor: true, deletedAt: null } }),
  ]);
  const admin = hasRole(user.role, "ADMIN");
  const all = admin ? await prisma.mentorship.findMany({ include: { mentor: { select: { name: true } }, mentee: { select: { name: true } } }, orderBy: { createdAt: "desc" } }) : [];

  return (
    <>
      <h1>Mentorordning</h1>
      <p className="muted" style={{ marginTop: -8, maxWidth: 720 }}>
        Ny i klubben? Få en erfaren klubkammerat, der viser dig rundt, tager dig med på en tur og svarer på alt det, man ikke lige ved:
        udstyr, våddragt, skiftezone og første stævne.
      </p>
      {fejl && <p className="status-warn">{fejl}</p>}
      {ny && <p className="notice">Du har fået en mentor, og I har begge fået en mail.</p>}

      <div className="grid two">
        <section className="card">
          <h2 className="h3" style={{ marginTop: 0 }}>Din mentor</h2>
          {mine ? (
            <Person p={mine.mentor} since={mine.createdAt} endId={mine.id} />
          ) : (
            <form action={requestMentor} className="stack">
              <p style={{ margin: 0 }}>{mentorCount} medlemmer har meldt sig som mentor.</p>
              <label>Hvad vil du gerne have hjælp til? (valgfrit)<input name="note" maxLength={300} placeholder="fx Jeg har aldrig svømmet crawl i åbent vand" /></label>
              <button className="button" type="submit" style={{ justifySelf: "start" }}>Få en mentor</button>
              <p className="muted" style={{ margin: 0 }}>Din mentor får dit navn, din mail og dit telefonnummer.</p>
            </form>
          )}
        </section>

        <section className="card">
          <h2 className="h3" style={{ marginTop: 0 }}>Bliv mentor</h2>
          <p style={{ marginTop: 0 }}>Har du været med et stykke tid? Hjælp et nyt medlem godt i gang. Det tager en tur eller to og lidt hjælp over mail.</p>
          <form action={setMentor}>
            <input type="hidden" name="mentor" value={me.mentor ? "0" : "1"} />
            <button className={`button ${me.mentor ? "secondary" : ""}`} type="submit">{me.mentor ? "✓ Du er mentor · Meld fra" : "Jeg vil gerne være mentor"}</button>
          </form>
          {me.mentor && <p className="muted">Nye medlemmer får dit navn, din mail og dit telefonnummer, når de bliver tildelt dig.</p>}
          {mentees.length > 0 && (
            <>
              <h3 style={{ marginBottom: 6 }}>Dine nye medlemmer</h3>
              {mentees.map((m) => <Person key={m.id} p={m.mentee} since={m.createdAt} endId={m.id} />)}
            </>
          )}
        </section>
      </div>

      {admin && all.length > 0 && (
        <section className="card" style={{ marginTop: 18 }}>
          <h2 className="h3" style={{ marginTop: 0 }}>Alle par (kun admin)</h2>
          <ul>{all.map((m) => <li key={m.id}>{m.mentee.name ?? "?"} har {m.mentor.name ?? "?"} som mentor, siden {dato(m.createdAt)}</li>)}</ul>
        </section>
      )}
    </>
  );
}

function Person({ p, since, endId }: { p: { name: string | null; email: string; phone: string | null }; since: Date; endId: string }) {
  return (
    <div className="mentor-person">
      <span className="avatar">{initials(p.name)}</span>
      <div>
        <b>{p.name ?? "Medlem"}</b>
        <div><a href={`mailto:${p.email}`}>{p.email}</a>{p.phone && <> · <a href={`tel:${p.phone}`}>{p.phone}</a></>}</div>
        <small className="muted">Siden {dato(since)} · </small>
        <form action={endMentorship} style={{ display: "inline" }}><input type="hidden" name="id" value={endId} /><button className="linklike" type="submit"><small>Afslut</small></button></form>
      </div>
    </div>
  );
}
