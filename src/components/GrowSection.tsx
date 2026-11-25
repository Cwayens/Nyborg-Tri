import Link from "next/link";
import { prisma } from "@/lib/db";
import { featuresOff } from "@/lib/features";
import { challengeStatus } from "@/lib/challenges";
import { TEST_BY_KEY } from "@/lib/benchmarks";
import { dato } from "@/lib/format";
import { formatDay, formatTime } from "@/lib/time";
import { ChallengeCard } from "./ChallengeCard";
import { groupsFor } from "@/lib/visibility";

const WEEK = 7 * 864e5;

// "Kom videre": udfordring, ugens tip, testdag og genveje til de funktioner, der er slået til
export async function GrowSection({ userId, joinedAt }: { userId: string; joinedAt: Date }) {
  const off = await featuresOff();
  const on = (f: Parameters<typeof off.has>[0]) => !off.has(f);
  const now = new Date();
  const [challenge, tip, testDay, plan, mentorship, race, buddy] = await Promise.all([
    on("udfordringer") ? prisma.challenge.findFirst({ where: { startsAt: { lte: now }, endsAt: { gt: now } }, orderBy: { endsAt: "asc" } }) : null,
    on("tips") ? prisma.tip.findFirst({ orderBy: { publishedAt: "desc" }, select: { title: true, body: true } }) : null,
    on("testdage") ? prisma.trainingSession.findFirst({ where: { testDay: { not: null }, startsAt: { gt: now }, cancelledAt: null, group: { in: await groupsFor(userId) } }, orderBy: { startsAt: "asc" } }) : null,
    on("begynder") ? prisma.beginnerPlan.findUnique({ where: { userId } }) : null,
    on("mentor") ? prisma.mentorship.findUnique({ where: { menteeId: userId }, include: { mentor: { select: { name: true } } } }) : null,
    on("staevner") ? prisma.race.findFirst({ where: { date: { gte: now } }, orderBy: { date: "asc" }, include: { _count: { select: { entries: true } } } }) : null,
    on("makker") ? prisma.buddyProfile.findUnique({ where: { userId }, select: { userId: true } }) : null,
  ]);
  const status = challenge ? await challengeStatus(challenge, userId) : null;
  const isNew = now.getTime() - joinedAt.getTime() < 120 * 864e5;
  const week = plan ? Math.min(10, Math.max(1, Math.floor((now.getTime() - plan.startedAt.getTime()) / WEEK) + 1)) : 0;

  const links = [
    on("begynder") && (plan || isNew) && { href: "/begynder", title: "Fra 0 til første triatlon", text: plan ? `Uge ${week} af 10 · ${plan.done.length} træninger gennemført` : "10 uger mod din første sprint, med programmer til uret" },
    on("makker") && { href: "/makker", title: "Find en makker", text: buddy ? "Se hvem der træner i dit tempo" : "Find klubkammerater i dit tempo og på dine tidspunkter" },
    on("mentor") && (mentorship || isNew) && { href: "/mentor", title: mentorship ? "Din mentor" : "Få en mentor", text: mentorship ? `${mentorship.mentor.name} hjælper dig i gang` : "En erfaren klubkammerat viser dig rundt" },
    on("mentor") && !isNew && !mentorship && { href: "/mentor", title: "Bliv mentor", text: "Hjælp et nyt medlem godt i gang" },
    on("staevner") && { href: "/staevner", title: "Stævner og samkørsel", text: race ? `Næste: ${race.name} ${dato(race.date)} · ${race._count.entries} fra klubben` : "Se hvem der skal til hvad, og kør sammen" },
    on("tips") && !tip && { href: "/tips", title: "Ugens tip", text: "Tips og videoer fra trænerne" },
  ].filter(Boolean) as { href: string; title: string; text: string }[];

  if (!links.length && !status && !tip && !testDay) return null;
  return (
    <>
      <div className="section-head"><h2>Kom videre</h2></div>
      {testDay && (
        <p className="card next-test">
          <span className="pill test-pill" style={{ marginLeft: 0 }}>Testdag</span> <b>{TEST_BY_KEY[testDay.testDay!].label}</b> {formatDay(testDay.startsAt)} kl. {formatTime(testDay.startsAt)}.{" "}
          Test igen og se din fremgang. <Link href="/kalender">Tilmeld dig</Link>
        </p>
      )}
      <div className="grid two">
        {status && challenge && <ChallengeCard c={challenge} s={status} compact />}
        {tip && (
          <Link href="/tips" className="card grow-tip">
            <span className="pill test-pill" style={{ marginLeft: 0 }}>Ugens tip</span>
            <strong>{tip.title}</strong>
            <span className="muted">{tip.body.length > 140 ? `${tip.body.slice(0, 140)}…` : tip.body}</span>
          </Link>
        )}
      </div>
      {links.length > 0 && (
        <div className="grow-links">
          {links.map((l) => (
            <Link key={l.href + l.title} href={l.href} className="card">
              <strong>{l.title}</strong>
              <span className="muted">{l.text}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
