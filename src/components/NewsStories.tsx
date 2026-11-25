import { isFresh, postImages } from "@/lib/news";
import { translator, type Locale } from "@/lib/i18n-core";

type P = { slug: string; title: string; featuredImage: string | null; images: string[]; publishedAt: Date; categories: string[] };

/** Række af runde billeder øverst på Overblik. Et tryk åbner nyhederne i fuld skærm. */
export function NewsStories({ posts, loc = "da" }: { posts: P[]; loc?: Locale }) {
  const t = translator(loc);
  if (posts.length === 0) return null;
  return (
    <nav className="story-strip" aria-label={t("Nyt fra klubben", "News from the club")}>
      {posts.map((p) => {
        const img = postImages(p)[0];
        return (
          <a key={p.slug} href={`/nyheder/historier#h-${p.slug}`} className={`story-bubble${isFresh(p.publishedAt) ? " fresh" : ""}`}>
            <span className="story-ring">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {img ? <img src={img} alt="" loading="lazy" /> : <span className="story-ph" aria-hidden="true">📣</span>}
            </span>
            <span className="story-label">{p.title}</span>
          </a>
        );
      })}
    </nav>
  );
}
