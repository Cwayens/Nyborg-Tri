// Nyheder i et mere moderne format: historier, flere billeder, video og emoji-reaktioner.
// Reaktioner viser kun antal, aldrig hvem, og der er ingen kommentarer, så børn ikke kan skrive med voksne.

export const REACTIONS = ["👍", "🔥", "💪", "❤️", "😂"] as const;
export type Reaction = (typeof REACTIONS)[number];
export const isReaction = (v: unknown): v is Reaction => typeof v === "string" && (REACTIONS as readonly string[]).includes(v);

/** Alle billeder i et opslag: forsidebilledet først, derefter de ekstra. */
export function postImages(p: { featuredImage: string | null; images?: string[] }): string[] {
  return [...new Set([p.featuredImage, ...(p.images ?? [])].filter((x): x is string => !!x))];
}

/**
 * Link til YouTube eller Vimeo → adresse til indlejring. null for alt andet, så vi aldrig indlejrer fremmede sider.
 * YouTube bruger youtube-nocookie.com, og videoen hentes først, når man trykker (se VideoEmbed).
 */
export function videoEmbed(url: string | null | undefined): { src: string; host: "YouTube" | "Vimeo" } | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  const id = (s: string | null | undefined) => (s && /^[A-Za-z0-9_-]{6,20}$/.test(s) ? s : null);
  let yt: string | null = null;
  if (host === "youtu.be") yt = id(u.pathname.slice(1));
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    yt = u.pathname === "/watch" ? id(u.searchParams.get("v")) : id(u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1]);
  }
  if (yt) return { src: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`, host: "YouTube" };
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const v = u.pathname.match(/(\d{6,12})/)?.[1];
    if (v) return { src: `https://player.vimeo.com/video/${v}?autoplay=1&dnt=1`, host: "Vimeo" };
  }
  return null;
}

/** Nyheden er ny, hvis den er fra den seneste uge (giver farvet ring i historierne). */
export const isFresh = (d: Date, now = new Date()) => now.getTime() - d.getTime() < 7 * 24 * 3600 * 1000;
