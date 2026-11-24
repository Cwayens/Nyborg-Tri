/**
 * Flytter billeder til klubbens eget billedlager (Vercel Blob):
 *  - logoer og profilbilleder, der ligger som data-URL i databasen
 *  - billeder og PDF'er, som importerede sider og nyheder henter fra den gamle WordPress-server
 * Billeder skaleres ned og gemmes som WebP. Kan køres flere gange; det, der allerede er flyttet, springes over.
 *
 *   BLOB_READ_WRITE_TOKEN=... DATABASE_URL=... npm run images:move
 *   DRY_RUN=1 npm run images:move     (viser kun, hvad der ville blive flyttet)
 *
 * Kør det efter sidste WordPress-import (ellers lægger importen de gamle adresser ind igen).
 */
import { PrismaClient } from "@prisma/client";
import { blobEnabled, optimize, storeFile } from "../src/lib/upload";

const prisma = new PrismaClient();
const DRY = process.env.DRY_RUN === "1";
const WP_URL = /https?:\/\/(?:www\.)?nyborgtri\.dk\/(?:wordpress\/|mhc\/wp\/)?wp-content\/uploads\/[^\s"'<>)]+/gi;
const IMAGE = /\.(jpe?g|png|gif|webp)$/i;

const done = new Map<string, string>();

/** Henter en WordPress-fil og lægger den i billedlageret. Returnerer den nye adresse. */
async function moveWpFile(url: string): Promise<string | null> {
  if (done.has(url)) return done.get(url)!;
  const path = new URL(url).pathname.replace(/^.*wp-content\/uploads\//, "wp/");
  if (DRY) { console.log("  flyt", url); done.set(url, url); return url; }
  const res = await fetch(url.replace(/^http:/, "https:"));
  if (!res.ok) { console.warn(`  kunne ikke hente ${url}: ${res.status}`); return null; }
  const body = Buffer.from(await res.arrayBuffer());
  const type = res.headers.get("content-type") ?? "application/octet-stream";
  const next = IMAGE.test(path)
    ? await storeFile(path.replace(IMAGE, ".webp"), await optimize(body, 1600), "image/webp")
    : await storeFile(path, body, type);
  done.set(url, next);
  return next;
}

async function rewrite(text: string): Promise<string> {
  let out = text;
  for (const url of new Set(text.match(WP_URL) ?? [])) {
    const next = await moveWpFile(url);
    if (next) out = out.split(url).join(next);
  }
  return out;
}

/** data:image/...;base64 → fil i billedlageret */
async function moveDataUrl(v: string | null, folder: string, id: string, maxWidth: number): Promise<string | null> {
  const m = v?.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!m) return null;
  if (DRY) { console.log(`  flyt data-URL (${Math.round(m[2].length * 0.75 / 1024)} KB) → ${folder}/${id}`); return null; }
  const buf = Buffer.from(m[2], "base64");
  return m[1] === "image/svg+xml"
    ? storeFile(`${folder}/${id}.svg`, buf, m[1])
    : storeFile(`${folder}/${id}.webp`, await optimize(buf, maxWidth), "image/webp");
}

async function main() {
  if (!DRY && !blobEnabled()) throw new Error("BLOB_READ_WRITE_TOKEN mangler (eller kør med DRY_RUN=1)");
  let n = 0;

  for (const s of await prisma.sponsor.findMany({ select: { id: true, name: true, logo: true } })) {
    const url = await moveDataUrl(s.logo, "sponsorer", s.id, 600);
    if (url) { await prisma.sponsor.update({ where: { id: s.id }, data: { logo: url } }); n++; console.log("sponsor", s.name); }
  }
  for (const a of await prisma.athleteProfile.findMany({ select: { id: true, slug: true, photo: true } })) {
    const url = await moveDataUrl(a.photo, "atleter", a.id, 1000);
    if (url) { await prisma.athleteProfile.update({ where: { id: a.id }, data: { photo: url } }); n++; console.log("atlet", a.slug); }
  }
  for (const c of await prisma.contactPerson.findMany({ select: { id: true, name: true, photo: true } })) {
    const url = await moveDataUrl(c.photo, "kontakt", c.id, 400);
    if (url) { await prisma.contactPerson.update({ where: { id: c.id }, data: { photo: url } }); n++; console.log("kontakt", c.name); }
  }
  for (const p of await prisma.page.findMany({ select: { id: true, path: true, body: true } })) {
    if (!WP_URL.test(p.body)) continue;
    WP_URL.lastIndex = 0;
    console.log("side", p.path);
    const body = await rewrite(p.body);
    if (!DRY && body !== p.body) { await prisma.page.update({ where: { id: p.id }, data: { body } }); n++; }
  }
  for (const p of await prisma.post.findMany({ select: { id: true, slug: true, body: true, featuredImage: true } })) {
    const hit = WP_URL.test(p.body) || WP_URL.test(p.featuredImage ?? "");
    WP_URL.lastIndex = 0;
    if (!hit) continue;
    console.log("nyhed", p.slug);
    const body = await rewrite(p.body);
    const featuredImage = p.featuredImage ? await rewrite(p.featuredImage) : null;
    if (!DRY && (body !== p.body || featuredImage !== p.featuredImage)) { await prisma.post.update({ where: { id: p.id }, data: { body, featuredImage } }); n++; }
  }
  console.log(DRY ? `Prøvekørsel: ${done.size} filer fra WordPress ville blive flyttet` : `Færdig: ${n} rækker opdateret, ${done.size} filer flyttet fra WordPress`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
