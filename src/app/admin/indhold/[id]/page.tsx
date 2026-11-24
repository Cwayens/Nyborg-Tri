import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/auth";
import { AdminNav } from "@/components/AdminNav";
import { prisma } from "@/lib/db";

export const metadata = { title: "Admin – rediger" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string }> };

function slugify(s: string) {
  return s.toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa").replace(/[^a-z0-9/]+/g, "-").replace(/^-+|-+$/g, "");
}

export default async function EditContent({ params, searchParams }: Props) {
  await requireAdmin();
  const { id } = await params;
  const isPost = (await searchParams).type !== "page";
  const isNew = id === "ny";
  const item = isNew ? null : isPost ? await prisma.post.findUnique({ where: { id } }) : await prisma.page.findUnique({ where: { id } });
  if (!isNew && !item) notFound();

  async function save(formData: FormData) {
    "use server";
    await requireAdmin();
    const title = String(formData.get("title")).trim();
    const body = String(formData.get("body"));
    const published = formData.get("published") === "on";
    const key = slugify(String(formData.get("key") || title));
    if (isPost) {
      const categories = String(formData.get("categories") ?? "").split(",").map((c) => c.trim()).filter(Boolean);
      const excerpt = String(formData.get("excerpt") ?? "").trim() || null;
      const data = { title, body, published, slug: key, categories, excerpt };
      if (isNew) await prisma.post.create({ data: { ...data, format: "MARKDOWN" } });
      else await prisma.post.update({ where: { id }, data });
      revalidatePath(`/nyheder/${key}`);
    } else {
      const data = { title, body, published, path: key };
      if (isNew) await prisma.page.create({ data: { ...data, format: "MARKDOWN" } });
      else await prisma.page.update({ where: { id }, data });
      revalidatePath(`/${key}`);
    }
    revalidatePath("/");
    redirect("/admin/indhold");
  }

  const post = isPost ? (item as Awaited<ReturnType<typeof prisma.post.findUnique>>) : null;
  const key = item ? ("slug" in item ? item.slug : item.path) : "";
  return (
    <>
      <h1>{isNew ? (isPost ? "Ny nyhed" : "Ny side") : `Rediger: ${item!.title}`}</h1>
      <AdminNav />
      <form action={save} className="stack" style={{ maxWidth: "100%" }}>
        <label>Titel<input name="title" defaultValue={item?.title ?? ""} required /></label>
        <label>
          {isPost ? "Adresse (slug)" : "Sti, fx om/bestyrelse"}
          <input name="key" defaultValue={key} placeholder="Udfyldes automatisk ud fra titlen" />
        </label>
        {isPost && (
          <>
            <label>Kategorier (kommasepareret)<input name="categories" defaultValue={post?.categories.join(", ") ?? ""} /></label>
            <label>Kort intro<input name="excerpt" defaultValue={post?.excerpt ?? ""} /></label>
          </>
        )}
        <label>
          Tekst {item?.format === "HTML" ? "(HTML – importeret fra den gamle side)" : "(Markdown: **fed**, ## overskrift, - punkt, [link](https://…))"}
          <textarea name="body" defaultValue={item?.body ?? ""} required />
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 400 }}>
          <input type="checkbox" name="published" defaultChecked={item?.published ?? true} /> Offentliggjort
        </label>
        <button className="button" type="submit">Gem</button>
      </form>
    </>
  );
}
