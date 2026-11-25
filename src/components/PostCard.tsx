import Link from "next/link";
import type { Post } from "@prisma/client";
import { dato } from "@/lib/format";
import { postImages } from "@/lib/news";
import type { Locale } from "@/lib/i18n-core";

export function PostCard({ post, loc = "da" }: { post: Pick<Post, "slug" | "title" | "excerpt" | "categories" | "featuredImage" | "publishedAt"> & { images?: string[]; video?: string | null }; loc?: Locale }) {
  const n = postImages(post).length;
  return (
    <article className="card post-card">
      {post.featuredImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.featuredImage} alt="" loading="lazy" />
      )}
      <div className="inner">
        <span className="tag">{post.categories[0] ?? (loc === "en" ? "News" : "Nyhed")}</span>
        {(n > 1 || post.video) && <span className="post-media muted">{n > 1 ? `📷 ${n}` : ""}{n > 1 && post.video ? " · " : ""}{post.video ? "▶ Video" : ""}</span>}
        <h3><Link href={`/nyheder/${post.slug}`}>{post.title}</Link></h3>
        <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>{dato(post.publishedAt, loc)}</p>
        {post.excerpt && <p style={{ marginBottom: 0 }}>{post.excerpt.length > 160 ? post.excerpt.slice(0, 157) + "…" : post.excerpt}</p>}
      </div>
    </article>
  );
}
