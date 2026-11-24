/**
 * Importerer alle sider og nyheder fra den nuværende WordPress-side (nyborgtri.dk).
 * Kan køres flere gange – eksisterende poster opdateres ud fra WordPress-id.
 *
 *   npm run import:wordpress
 *
 * Billeder linker indtil videre til den gamle side. Flyt dem til egen lagring,
 * før WordPress lukkes (se docs/arkitektur.md).
 */
import { PrismaClient } from "@prisma/client";
import { toPage, toPost, type WpItem } from "../src/lib/wp-import";

const SITE = process.env.WP_URL ?? "https://www.nyborgtri.dk";
// Sider der erstattes af funktioner i det nye system (fx /om og /om/kontakt), eller ikke skal med
const SKIP_PAGES = new Set(["bliv-medlem", "test", "fortryd-tilmelding", "tilmeld-nyhedbrev", "kalender", "om", "om/kontakt", "privatlivspolitik", "sponsorer"]);

const prisma = new PrismaClient();

async function fetchAll<T>(endpoint: string): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; ; page++) {
    const sep = endpoint.includes("?") ? "&" : "?";
    const res = await fetch(`${SITE}/wp-json/wp/v2/${endpoint}${sep}per_page=100&page=${page}`);
    if (res.status === 400) break; // forbi sidste side
    if (!res.ok) throw new Error(`${endpoint}: ${res.status}`);
    const items = (await res.json()) as T[];
    out.push(...items);
    const totalPages = Number(res.headers.get("X-WP-TotalPages") ?? 1);
    if (page >= totalPages) break;
  }
  return out;
}

async function main() {
  const categories = await fetchAll<{ id: number; name: string }>("categories");
  const catNames = new Map(categories.map((c) => [c.id, c.name.replace(/&amp;/g, "&")]));

  const pages = await fetchAll<WpItem>("pages");
  let p = 0;
  for (const item of pages) {
    const data = toPage(item, SITE);
    if (SKIP_PAGES.has(data.path)) continue;
    await prisma.page.upsert({ where: { wpId: item.id }, update: data, create: data });
    p++;
  }

  const posts = await fetchAll<WpItem>("posts?_embed=author,wp:featuredmedia");
  for (const item of posts) {
    const data = toPost(item, SITE, catNames);
    await prisma.post.upsert({ where: { wpId: item.id }, update: data, create: data });
  }

  console.log(`Importeret ${p} sider og ${posts.length} nyheder fra ${SITE}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
