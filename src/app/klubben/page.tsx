import Link from "next/link";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { PostCard } from "@/components/PostCard";
import { MEMBER_INFO } from "@/lib/navigation";
import { featuresOff } from "@/lib/features";

export const metadata = { title: "Klubinfo og nyheder" };

// Medlemmernes samlede sted for nyheder, praktisk info og foreningsdokumenter
export default async function ClubInfo() {
  await requireUser("/klubben");
  const posts = await prisma.post.findMany({ where: { published: true }, orderBy: { publishedAt: "desc" }, take: 6 });
  const off = await featuresOff();
  const grow = [
    { f: "begynder", label: "Fra 0 til første triatlon", href: "/begynder" },
    { f: "makker", label: "Find en makker", href: "/makker" },
    { f: "mentor", label: "Mentorordning", href: "/mentor" },
    { f: "tips", label: "Ugens tip", href: "/tips" },
    { f: "udfordringer", label: "Klubudfordringer", href: "/udfordringer" },
    { f: "staevner", label: "Stævner og samkørsel", href: "/staevner" },
  ].filter((l) => !off.has(l.f as never));
  const groups = grow.length ? [{ title: "Bliv bedre", links: grow }, ...MEMBER_INFO] : MEMBER_INFO;

  return (
    <>
      <h1>Klubinfo og nyheder</h1>
      <div className="info-groups">
        {groups.map((g) => (
          <section key={g.title} className="card">
            <h2 className="h3">{g.title}</h2>
            <ul className="linklist">
              {g.links.map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}
            </ul>
          </section>
        ))}
      </div>

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
