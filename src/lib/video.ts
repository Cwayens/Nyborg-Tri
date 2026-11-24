// Indlejring af YouTube- og Vimeo-videoer uden sporingscookies (youtube-nocookie, Vimeo med dnt=1).

export function videoEmbed(url: string | null | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") id = u.searchParams.get("v") ?? /^\/(?:shorts|embed)\/([\w-]+)/.exec(u.pathname)?.[1] ?? null;
  if (id && /^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const v = /(\d{6,12})/.exec(u.pathname)?.[1];
    if (v) return `https://player.vimeo.com/video/${v}?dnt=1`;
  }
  return null;
}
