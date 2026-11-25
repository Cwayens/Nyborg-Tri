import Link from "next/link";
import { prisma } from "@/lib/db";
import { featuresOff } from "@/lib/features";
import { challengeStatus } from "@/lib/challenges";
import { TEST_BY_KEY } from "@/lib/benchmarks";
import { dato } from "@/lib/format";
import { formatDay, formatTime } from "@/lib/time";
import { ChallengeCard } from "./ChallengeCard";
import { teamsFor } from "@/lib/visibility";
import { translator, type Locale } from "@/lib/i18n-core";

const WEEK = 7 * 864e5;

// "Kom videre": udfordring, ugens tip, testdag og genveje til de funktioner, der er slået til
export async function GrowSection({ userId, joinedAt, loc = "da" }: { userId: string; joinedAt: Date; loc?: Locale }) {
  const t = translator(loc);
  const off = await featuresOff();
  const on = (f: Parameters<typeof off.has>[0]) => !off.has(f);
  const now = new Date();
  const [challenge, tip, testDay, plan, mentorship, race, buddy] = await Promise.all([
    on("udfordringer") ? prisma.challenge.findFirst({ where: { startsAt: { lte: now }, endsAt: { gt: now } }, orderBy: { endsAt: "asc" } }) : null,
    on("tips") ? prisma.tip.findFirst({ orderBy: { publishedAt: "desc" }, select: { title: true, body: true } }) : null,
    on("testdage") ? prisma.trainingSession.findFirst({ where: { testDay: { not: null }, startsAt: { gt: now }, cancelledAt: null, teamId: { in: await teamsFor(userId) } }, orderBy: { startsAt: "asc" } }) : null,
    on("begynder") ? prisma.beginnerPlan.findUnique({ where: { userId } }) : null,
    on("mentor") ? prisma.mentorship.findUnique({ where: { menteeId: userId }, include: { mentor: { select: { name: true } } } }) : null,
    on("staevner") ? prisma.race.findFirst({ where: { date: { gte: now } }, orderBy: { date: "asc" }, include: { _count: { select: { entries: true } } } }) : null,
    on("makker") ? prisma.buddyProfile.findUnique({ where: { userId }, select: { userId: true } }) : null,
  ]);
  const status = challenge ? await challengeStatus(challenge, userId) : null;
  const isNew = now.getTime() - joinedAt.getTime() < 120 * 864e5;
  const week = plan ? Math.min(10, Math.max(1, Math.floor((now.getTime() - plan.startedAt.getTime()) / WEEK) + 1)) : 0;

  const links = [
    on("begynder") && (plan || isNew) && { href: "/begynder", title: t("Fra 0 til første triatlon", "From 0 to your first triathlon"), text: plan ? t(`Uge ${week} af 10 · ${plan.done.length} træninger gennemført`, `Week ${week} of 10 · ${plan.done.length} sessions done`) : t("10 uger mod din første sprint, med programmer til uret", "10 weeks to your first sprint, with workouts for your watch") },
    on("makker") && { href: "/makker", title: t("Find en makker", "Find a buddy"), text: buddy ? t("Se hvem der træner i dit tempo", "See who trains at your pace") : t("Find klubkammerater i dit tempo og på dine tidspunkter", "Find clubmates at your pace and times") },
    on("mentor") && (mentorship || isNew) && { href: "/mentor", title: mentorship ? t("Din mentor", "Your mentor") : t("Få en mentor", "Get a mentor"), text: mentorship ? t(`${mentorship.mentor.name} hjælper dig i gang`, `${mentorship.mentor.name} helps you get started`) : t("En erfaren klubkammerat viser dig rundt", "An experienced clubmate shows you around") },
    on("mentor") && !isNew && !mentorship && { href: "/mentor", title: t("Bliv mentor", "Become a mentor"), text: t("Hjælp et nyt medlem godt i gang", "Help a new member get started") },
    on("staevner") && { href: "/staevner", title: t("Stævner og samkørsel", "Races and car pooling"), text: race ? t(`Næste: ${race.name} ${dato(race.date)} · ${race._count.entries} fra klubben`, `Next: ${race.name} ${dato(race.date, loc)} · ${race._count.entries} from the club`) : t("Se hvem der skal til hvad, og kør sammen", "See who's racing what, and share a ride") },
    on("tips") && !tip && { href: "/tips", title: t("Ugens tip", "Tip of the week"), text: t("Tips og videoer fra trænerne", "Tips and videos from the coaches") },
  ].filter(Boolean) as { href: string; title: string; text: string }[];

  if (!links.length && !status && !tip && !testDay) return null;
  return (
    <>
      <div className="section-head"><h2>{t("Kom videre", "Keep going")}</h2></div>
      {testDay && (
        <p className="card next-test">
          <span className="pill test-pill" style={{ marginLeft: 0 }}>{t("Testdag", "Test day")}</span> <b>{TEST_BY_KEY[testDay.testDay!].label}</b> {formatDay(testDay.startsAt, loc)} {t("kl.", "at")} {formatTime(testDay.startsAt, loc)}.{" "}
          {t("Test igen og se din fremgang.", "Test again and see your progress.")} <Link href="/kalender">{t("Tilmeld dig", "Sign up")}</Link>
        </p>
      )}
      <div className="grid two">
        {status && challenge && <ChallengeCard c={challenge} s={status} compact />}
        {tip && (
          <Link href="/tips" className="card grow-tip">
            <span className="pill test-pill" style={{ marginLeft: 0 }}>{t("Ugens tip", "Tip of the week")}</span>
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
