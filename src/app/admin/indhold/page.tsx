import Link from "next/link";
import { requireAdmin } from "@/auth";
import { AdminNav } from "@/components/AdminNav";
import { prisma } from "@/lib/db";
import { dato } from "@/lib/format";

export const metadata = { title: "Admin – indhold" };

export default async function AdminContent() {
  await requireAdmin();
  const [posts, pages] = await Promise.all([
    prisma.post.findMany({ orderBy: { publishedAt: "desc" }, take: 30, select: { id: true, title: true, publishedAt: true, published: true } }),
    prisma.page.findMany({ orderBy: { path: "asc" }, select: { id: true, title: true, path: true, published: true } }),
  ]);
  return (
    <>
      <h1>Indhold</h1>
      <AdminNav />
      <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link className="button" href="/admin/indhold/ny?type=post">Skriv nyhed</Link>
        <Link className="button secondary" href="/admin/indhold/ny?type=page">Ny side</Link>
      </p>
      <h2>Nyheder</h2>
      <ul>
        {posts.map((p) => (
          <li key={p.id}>
            <Link href={`/admin/indhold/${p.id}?type=post`}>{p.title}</Link> <span className="muted">· {dato(p.publishedAt)}{p.published ? "" : " · kladde"}</span>
          </li>
        ))}
      </ul>
      <h2>Sider</h2>
      <ul>
        {pages.map((p) => (
          <li key={p.id}>
            <Link href={`/admin/indhold/${p.id}?type=page`}>{p.title}</Link> <span className="muted">/{p.path}{p.published ? "" : " · skjult"}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
