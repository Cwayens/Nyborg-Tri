import Link from "next/link";
import { prisma } from "@/lib/db";
import { PostCard } from "@/components/PostCard";

export const revalidate = 300;

export default async function Home() {
  const posts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    take: 9,
  });
  return (
    <>
      <section className="hero">
        <h1>Din triatlonklub på Østfyn</h1>
        <p>
          Svømning, cykling og løb for unge og gamle, begyndere og erfarne. Kom og prøv en træning, før du melder dig ind.
        </p>
        <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/bliv-medlem" className="button">Bliv medlem</Link>
          <Link href="/traeningstider" className="button secondary">Træningstider</Link>
        </p>
      </section>
      <h2>Seneste nyt</h2>
      <div className="grid">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
      <p style={{ marginTop: 24 }}>
        <Link href="/nyheder">Se alle nyheder →</Link>
      </p>
    </>
  );
}
