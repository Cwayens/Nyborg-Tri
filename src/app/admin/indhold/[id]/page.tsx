import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/auth";
import { AdminNav } from "@/components/AdminNav";
import { prisma } from "@/lib/db";
import { readImage } from "@/lib/upload";
import { postImages, videoEmbed } from "@/lib/news";

export const metadata = { title: "Admin – rediger" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string; fejl?: string }> };

// Understreg beholdes, så importerede nyheder fra den gamle side (fx hurtigste_makrel) beholder deres adresse, når de rettes
function slugify(s: string) {
  return s.toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa").replace(/[^a-z0-9/_]+/g, "-").replace(/^-+|-+$/g, "");
}

export default async function EditContent({ params, searchParams }: Props) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const isPost = sp.type !== "page";
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
      // Billeder: behold dem, der ikke er krydset af, og læg nye til (det første bliver forsidebillede)
      const old = isNew ? [] : postImages(item as { featuredImage: string | null; images: string[] });
      const kept = old.filter((_, i) => formData.get(`fjern${i}`) !== "on");
      const added: string[] = [];
      for (const f of formData.getAll("nyeBilleder")) {
        const r = await readImage(f, { folder: "nyheder", maxWidth: 1600 });
        if (!r.ok) redirect(`/admin/indhold/${id}?fejl=${encodeURIComponent(r.error)}`);
        if (r.ok && r.url) added.push(r.url);
      }
      const all = [...kept, ...added].slice(0, 12);
      const videoRaw = String(formData.get("video") ?? "").trim();
      if (videoRaw && !videoEmbed(videoRaw)) redirect(`/admin/indhold/${id}?fejl=${encodeURIComponent("Videoen skal være et link til YouTube eller Vimeo")}`);
      const media = { featuredImage: all[0] ?? null, images: all.slice(1), video: videoRaw || null };
      const data = { title, body, published, slug: key, categories, excerpt, ...media };
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
      {sp.fejl && <p className="status-warn">{sp.fejl}</p>}
      <form action={save} className="stack" style={{ maxWidth: "100%" }} encType="multipart/form-data">
        <label>Titel<input name="title" defaultValue={item?.title ?? ""} required /></label>
        <label>
          {isPost ? "Adresse (slug)" : "Sti, fx om/bestyrelse"}
          <input name="key" defaultValue={key} placeholder="Udfyldes automatisk ud fra titlen" />
        </label>
        {isPost && (
          <>
            <label>Kategorier (kommasepareret)<input name="categories" defaultValue={post?.categories.join(", ") ?? ""} /></label>
            <label>Kort intro<input name="excerpt" defaultValue={post?.excerpt ?? ""} /><small className="muted">Vises på historien i fuld skærm. Hold den kort, 1-2 sætninger.</small></label>
            <fieldset className="stack">
              <legend>Billeder og video</legend>
              {post && postImages(post).length > 0 && (
                <div className="post-admin-imgs">
                  {postImages(post).map((src, i) => (
                    <label key={src} className="check">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" />
                      <span><input type="checkbox" name={`fjern${i}`} /> Fjern{i === 0 ? " (forsidebillede)" : ""}</span>
                    </label>
                  ))}
                </div>
              )}
              <label>Tilføj billeder<input type="file" name="nyeBilleder" multiple accept="image/png,image/jpeg,image/webp,image/gif" />
                <small className="muted">Det første billede bliver forsidebillede. Højst 4 MB i alt pr. gang, så tilføj flere ad gangen, hvis de er store. Op til 12 billeder.</small>
              </label>
              <label>Video (valgfri)<input name="video" type="url" defaultValue={post?.video ?? ""} placeholder="https://www.youtube.com/watch?v=… eller https://vimeo.com/…" />
                <small className="muted">Link til YouTube (også Shorts) eller Vimeo. Videoen hentes først, når man trykker på den.</small>
              </label>
            </fieldset>
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
