import Link from "next/link";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { PostCard } from "@/components/PostCard";
import { getLocale, translator } from "@/lib/i18n";

export async function generateMetadata() {
  return { title: translator(await getLocale())("Nyheder", "News") };
}
const PER_PAGE = 12;

export default async function News({ searchParams }: { searchParams: Promise<{ side?: string; kategori?: string }> }) {
  await requireUser("/nyheder");
  const { side, kategori } = await searchParams;
  const page = Math.max(1, Number(side) || 1);
  const where = { published: true, ...(kategori ? { categories: { has: kategori } } : {}) };
  const [posts, total] = await Promise.all([
    prisma.post.findMany({ where, orderBy: { publishedAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.post.count({ where }),
  ]);
  const pages = Math.ceil(total / PER_PAGE);
  const loc = await getLocale();
  const t = translator(loc);
  const q = (n: number) => `/nyheder?side=${n}${kategori ? `&kategori=${encodeURIComponent(kategori)}` : ""}`;
  return (
    <>
      <div className="section-head" style={{ marginTop: 0 }}>
        <h1 style={{ margin: 0 }}>{kategori ?? t("Nyheder", "News")}</h1>
        {total > 0 && <a href="/nyheder/historier?fra=nyheder" className="button small">{t("▶ Se som historier", "▶ View as stories")}</a>}
      </div>
      <div className="grid">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} loc={loc} />
        ))}
      </div>
      <p style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
        {page > 1 ? <Link href={q(page - 1)}>{t("← Nyere", "← Newer")}</Link> : <span />}
        {page < pages && <Link href={q(page + 1)}>{t("Ældre →", "Older →")}</Link>}
      </p>
    </>
  );
}
