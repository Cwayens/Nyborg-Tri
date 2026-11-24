import Link from "next/link";
import type { Post } from "@prisma/client";
import { dato } from "@/lib/format";

export function PostCard({ post }: { post: Pick<Post, "slug" | "title" | "excerpt" | "categories" | "featuredImage" | "publishedAt"> }) {
  return (
    <article className="card post-card">
      {post.featuredImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.featuredImage} alt="" loading="lazy" />
      )}
      <span className="tag">{post.categories[0] ?? "Nyhed"}</span>
      <h3>
        <Link href={`/nyheder/${post.slug}`}>{post.title}</Link>
      </h3>
      <p className="muted">{dato(post.publishedAt)}</p>
      {post.excerpt && <p>{post.excerpt}</p>}
    </article>
  );
}
