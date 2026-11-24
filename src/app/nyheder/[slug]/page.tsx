import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { renderBody } from "@/lib/content";
import { dato } from "@/lib/format";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

async function getPost(slug: string) {
  return prisma.post.findFirst({ where: { slug, published: true } });
}

export async function generateMetadata({ params }: Props) {
  const post = await getPost((await params).slug);
  return post ? { title: post.title, description: post.excerpt ?? undefined } : {};
}

export default async function NewsPost({ params }: Props) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  return (
    <article>
      <p>
        {post.categories.map((c) => (
          <Link key={c} href={`/nyheder?kategori=${encodeURIComponent(c)}`} className="tag" style={{ marginRight: 10 }}>
            {c}
          </Link>
        ))}
      </p>
      <h1>{post.title}</h1>
      <p className="muted">
        {dato(post.publishedAt)}
        {post.author ? ` · ${post.author}` : ""}
      </p>
      <div className="content" dangerouslySetInnerHTML={{ __html: renderBody(post.body, post.format) }} />
    </article>
  );
}
