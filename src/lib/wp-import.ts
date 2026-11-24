// Ren omformning af WordPress REST-data → vores Page/Post. Ingen netværk her, så den kan testes.

export interface WpItem {
  id: number;
  slug: string;
  link: string;
  date_gmt: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt?: { rendered: string };
  categories?: number[];
  _embedded?: {
    author?: Array<{ name?: string }>;
    "wp:featuredmedia"?: Array<{ source_url?: string }>;
  };
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&#8211;": "–", "&#8212;": "—", "&#8216;": "‘", "&#8217;": "’",
  "&#8220;": "“", "&#8221;": "”", "&#8230;": "…", "&nbsp;": " ", "&quot;": '"', "&#039;": "'", "&lt;": "<", "&gt;": ">",
};

export function decodeEntities(s: string): string {
  return s.replace(/&#?\w+;/g, (m) => ENTITIES[m] ?? m);
}

export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

/** Fjern WordPress-shortcodes (fx [column size="one-half"]) og gør interne links relative. */
export function cleanHtml(html: string, siteUrl: string): string {
  const host = new URL(siteUrl).host.replace(/^www\./, "");
  const linkRe = new RegExp(`href="https?://(www\\.)?${host.replace(/\./g, "\\.")}(/[^"]*)"`, "g");
  return html
    .replace(/\[\/?[a-z_]+(?:\s[^\]]*)?\]/gi, "")
    .replace(linkRe, (_m, _w, path: string) => (path.startsWith("/wp-content/") || path.startsWith("/download/") ? _m : `href="${path}"`))
    .replace(/<p>\s*(&nbsp;)?\s*<\/p>/g, "")
    .trim();
}

export function pathFromLink(link: string): string {
  return new URL(link).pathname.replace(/^\/+|\/+$/g, "");
}

export function toPage(item: WpItem, siteUrl: string) {
  return {
    wpId: item.id,
    path: pathFromLink(item.link),
    title: decodeEntities(item.title.rendered),
    body: cleanHtml(item.content.rendered, siteUrl),
    format: "HTML" as const,
  };
}

export function toPost(item: WpItem, siteUrl: string, categoryNames: Map<number, string>) {
  return {
    wpId: item.id,
    slug: item.slug,
    title: decodeEntities(item.title.rendered),
    excerpt: item.excerpt ? stripTags(item.excerpt.rendered).slice(0, 300) : null,
    body: cleanHtml(item.content.rendered, siteUrl),
    format: "HTML" as const,
    categories: (item.categories ?? []).map((c) => categoryNames.get(c)).filter((c): c is string => !!c),
    featuredImage: item._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null,
    author: item._embedded?.author?.[0]?.name ?? null,
    publishedAt: new Date(item.date_gmt + "Z"),
  };
}
