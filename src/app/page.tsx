import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PostCard } from "@/components/PostCard";
import { BikeIcon, CalendarIcon, RunIcon, SwimIcon, UsersIcon, ActivityIcon } from "@/components/Icons";
import { DISCIPLINE_LABEL, GROUP_LABEL } from "@/lib/roles";
import { formatDay, formatTime } from "@/lib/time";

export default async function Home() {
  // Indloggede medlemmer lander på deres eget overblik
  if ((await auth())?.user) redirect("/min-side");

  const [posts, next] = await Promise.all([
    prisma.post.findMany({ where: { published: true }, orderBy: { publishedAt: "desc" }, take: 3 }),
    prisma.trainingSession.findMany({ where: { startsAt: { gte: new Date() }, cancelledAt: null }, orderBy: { startsAt: "asc" }, take: 4 }),
  ]);

  return (
    <>
      <section className="hero">
        <h1>Triatlon for alle på Østfyn</h1>
        <p>Svøm, cykl og løb sammen med andre. Begynder eller erfaren, ung eller voksen: der er en træning til dig, og du kan prøve gratis i 14 dage.</p>
        <div className="hero-actions">
          <Link href="/bliv-medlem" className="button">Kom i gang</Link>
          <Link href="/kalender" className="button ghost">Se træningerne</Link>
        </div>
        <svg className="wave" viewBox="0 0 1200 70" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 40 C 200 80 400 0 600 30 S 1000 70 1200 25 V70 H0 Z" fill="currentColor" />
        </svg>
      </section>

      <section className="features" aria-label="Det får du som medlem">
        <Feature icon={<span className="disc disc-SWIM disc-icon"><SwimIcon /></span>} title="Fælles træning" text="Svømning med træner, cykling og løb hver uge, delt i Elite, Bredde og Børn." />
        <Feature icon={<span className="disc disc-RUN disc-icon"><UsersIcon /></span>} title="Træn sammen" text="Se hvem der kommer, og find nogen at løbe eller cykle med." />
        <Feature icon={<span className="disc disc-BIKE disc-icon"><ActivityIcon /></span>} title="Dit ur er med" text="Forbind Strava, så Garmin, Wahoo, Coros og andre ure tæller med i din statistik." />
        <Feature icon={<span className="disc disc-STRENGTH disc-icon"><CalendarIcon /></span>} title="Altid i lommen" text="Kalender på telefonen, tilmelding med ét tryk og påmindelser i din egen kalender." />
      </section>

      {next.length > 0 && (
        <>
          <div className="section-head">
            <h2>Næste træninger</h2>
            <Link href="/kalender">Hele kalenderen →</Link>
          </div>
          <div className="card">
            {next.map((t) => (
              <div key={t.id} className={`item disc disc-${t.discipline}`}>
                <span className="disc-icon">{t.discipline === "SWIM" ? <SwimIcon /> : t.discipline === "BIKE" ? <BikeIcon /> : <RunIcon />}</span>
                <div className="body">
                  <div className="title">{t.title}</div>
                  <div className="meta">{formatDay(t.startsAt)} kl. {formatTime(t.startsAt)} · {t.location}</div>
                </div>
                <span className="pill">{GROUP_LABEL[t.group]}</span>
                <span className="sr-only">{DISCIPLINE_LABEL[t.discipline]}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-head">
        <h2>Nyt fra klubben</h2>
        <Link href="/nyheder">Alle nyheder →</Link>
      </div>
      <div className="grid">
        {posts.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
    </>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="feature card">
      {icon}
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}
