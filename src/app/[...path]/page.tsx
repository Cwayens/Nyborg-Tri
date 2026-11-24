import { notFound, permanentRedirect, redirect } from "next/navigation";
import { auth } from "@/auth";
import { isMemberOnlyPath } from "@/lib/navigation";
import { prisma } from "@/lib/db";
import { renderBody } from "@/lib/content";

// Viser indholdssider på de samme adresser som den gamle WordPress-side (fx /om/bestyrelse).
// Gamle nyhedslinks (/indlaegets-slug/) sendes videre til /nyheder/indlaegets-slug.


type Props = { params: Promise<{ path: string[] }> };

async function getPage(path: string[]) {
  return prisma.page.findFirst({ where: { path: path.map(decodeURIComponent).join("/"), published: true } });
}

export async function generateMetadata({ params }: Props) {
  const page = await getPage((await params).path);
  return page ? { title: page.title } : {};
}

export default async function ContentPage({ params }: Props) {
  const { path } = await params;
  const joined = path.map(decodeURIComponent).join("/");
  // Intern klubinfo kræver login (offentligt vises kun det, der informerer nye medlemmer)
  if (isMemberOnlyPath(joined) && !(await auth())?.user) redirect(`/login?callbackUrl=${encodeURIComponent("/" + joined)}`);
  const page = await getPage(path);
  if (!page) {
    if (path.length === 1) {
      const post = await prisma.post.findFirst({ where: { slug: decodeURIComponent(path[0]) }, select: { slug: true } });
      if (post) permanentRedirect(`/nyheder/${post.slug}`);
    }
    notFound();
  }
  return (
    <article>
      <h1>{page.title}</h1>
      <div className="content" dangerouslySetInnerHTML={{ __html: renderBody(page.body, page.format) }} />
    </article>
  );
}
