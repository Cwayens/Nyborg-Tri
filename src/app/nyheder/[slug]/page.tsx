import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { renderBody } from "@/lib/content";
import { dato } from "@/lib/format";
import { postImages, videoEmbed } from "@/lib/news";
import { reactionsFor } from "@/lib/news-db";
import { Reactions } from "@/components/Reactions";
import { VideoEmbed } from "@/components/VideoEmbed";
import { getLocale, translator } from "@/lib/i18n";


type Props = { params: Promise<{ slug: string }> };

async function getPost(slug: string) {
  return prisma.post.findFirst({ where: { slug, published: true } });
}

export async function generateMetadata({ params }: Props) {
  const post = await getPost((await params).slug);
  return post ? { title: post.title, description: post.excerpt ?? undefined } : {};
}

export default async function NewsPost({ params }: Props) {
  const { slug } = await params;
  const user = await requireUser(`/nyheder/${slug}`);
  const post = await getPost(slug);
  if (!post) notFound();
  const loc = await getLocale();
  const t = translator(loc);
  const imgs = postImages(post);
  const video = videoEmbed(post.video);
  const reactions = (await reactionsFor([post.id], user.id)).get(post.id);
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
        {dato(post.publishedAt, loc)}
        {post.author ? ` · ${post.author}` : ""}
        {" · "}<a href={`/nyheder/historier?fra=nyheder#h-${post.slug}`}>{t("Se som historie", "View as story")}</a>
      </p>
      {video && <VideoEmbed src={video.src} host={video.host} label={{ play: t("Se videoen", "Watch the video"), note: t(`Afspilles fra ${video.host}`, `Plays from ${video.host}`) }} />}
      <div className="content" dangerouslySetInnerHTML={{ __html: renderBody(post.body, post.format) }} />
      {/* Billeder, der ikke allerede står i teksten (importerede nyheder har dem i teksten) */}
      {imgs.length > 1 && (
        <div className="post-gallery">
          {imgs.filter((src) => !post.body.includes(src)).map((src) => (
            <a key={src} href={src} target="_blank" rel="noopener">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" />
            </a>
          ))}
        </div>
      )}
      <Reactions postId={post.id} state={reactions} loc={loc} />
    </article>
  );
}
