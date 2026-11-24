import Link from "next/link";
import { prisma } from "@/lib/db";
import { PostCard } from "@/components/PostCard";

export const metadata = { title: "Nyheder" };
const PER_PAGE = 12;

export default async function News({ searchParams }: { searchParams: Promise<{ side?: string; kategori?: string }> }) {
  const { side, kategori } = await searchParams;
  const page = Math.max(1, Number(side) || 1);
  const where = { published: true, ...(kategori ? { categories: { has: kategori } } : {}) };
  const [posts, total] = await Promise.all([
    prisma.post.findMany({ where, orderBy: { publishedAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.post.count({ where }),
  ]);
  const pages = Math.ceil(total / PER_PAGE);
  const q = (n: number) => `/nyheder?side=${n}${kategori ? `&kategori=${encodeURIComponent(kategori)}` : ""}`;
  return (
    <>
      <h1>{kategori ?? "Nyheder"}</h1>
      <div className="grid">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
      <p style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
        {page > 1 ? <Link href={q(page - 1)}>← Nyere</Link> : <span />}
        {page < pages && <Link href={q(page + 1)}>Ældre →</Link>}
      </p>
    </>
  );
}
