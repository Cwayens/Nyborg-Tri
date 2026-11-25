import Link from "next/link";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { dato } from "@/lib/format";
import { postImages, videoEmbed } from "@/lib/news";
import { reactionsFor } from "@/lib/news-db";
import { Reactions } from "@/components/Reactions";
import { VideoEmbed } from "@/components/VideoEmbed";
import { getLocale, translator } from "@/lib/i18n";

export async function generateMetadata() {
  return { title: translator(await getLocale())("Nyheder", "News") };
}

// Nyheder i fuld skærm: swipe op og ned mellem opslag, til siden mellem billeder (som historier på Instagram og TikTok).
export default async function Stories({ searchParams }: { searchParams: Promise<{ fra?: string }> }) {
  const user = await requireUser("/nyheder/historier");
  const back = (await searchParams).fra === "nyheder" ? "/nyheder" : "/min-side";
  const loc = await getLocale();
  const t = translator(loc);
  const posts = await prisma.post.findMany({
    where: { published: true }, orderBy: { publishedAt: "desc" }, take: 20,
    select: { id: true, slug: true, title: true, excerpt: true, featuredImage: true, images: true, video: true, publishedAt: true, categories: true },
  });
  const reactions = await reactionsFor(posts.map((p) => p.id), user.id);
  return (
    <div className="stories" role="feed" aria-label={t("Nyheder fra klubben", "News from the club")}>
      <Link href={back} className="stories-close" aria-label={t("Luk", "Close")}>✕</Link>
      {posts.length === 0 && <p className="stories-empty">{t("Ingen nyheder endnu.", "No news yet.")}</p>}
      {posts.map((p, i) => {
        const imgs = postImages(p);
        const video = videoEmbed(p.video);
        return (
          <article key={p.id} id={`h-${p.slug}`} className={`story${imgs.length ? "" : " no-img"}`} aria-posinset={i + 1} aria-setsize={posts.length}>
            {imgs.length > 0 && (
              <div className="story-imgs">
                {imgs.map((src, j) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt="" loading={i < 2 && j === 0 ? "eager" : "lazy"} />
                ))}
              </div>
            )}
            <div className="story-text">
              <span className="story-meta">
                {p.categories[0] ?? t("Nyhed", "News")} · {dato(p.publishedAt, loc)} · {i + 1}/{posts.length}
                {imgs.length > 1 && <> · <span aria-label={t(`${imgs.length} billeder, swipe til siden`, `${imgs.length} photos, swipe sideways`)}>📷 {imgs.length} ↔</span></>}
              </span>
              <h2>{p.title}</h2>
              {p.excerpt && <p>{p.excerpt.length > 220 ? p.excerpt.slice(0, 217) + "…" : p.excerpt}</p>}
              {video && <VideoEmbed src={video.src} host={video.host} label={{ play: t("Se videoen", "Watch the video"), note: t(`Afspilles fra ${video.host}`, `Plays from ${video.host}`) }} />}
              <div className="story-actions">
                <Reactions postId={p.id} state={reactions.get(p.id)} loc={loc} dark />
                <Link href={`/nyheder/${p.slug}`} className="story-more">{t("Læs hele nyheden →", "Read the full post →")}</Link>
              </div>
            </div>
            {i === 0 && posts.length > 1 && <span className="story-hint" aria-hidden="true">{t("Swipe op for næste", "Swipe up for next")} ↑</span>}
          </article>
        );
      })}
    </div>
  );
}
