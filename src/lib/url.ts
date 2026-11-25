import { headers } from "next/headers";
import { getClub } from "./site";

/**
 * Sidens adresse for den aktuelle klub. I en forespørgsel: domænet, siden blev åbnet på (hver klub har sit eget).
 * Uden forespørgsel (cron, scripts): klubbens domæne, ellers AUTH_URL.
 */
export async function baseUrl(): Promise<string> {
  let h: Headers | null = null;
  try { h = await headers(); } catch (e) {
    if (!(e instanceof Error && /outside a request scope/i.test(e.message))) throw e;
    h = null;
  }
  const host = h?.get("host") ?? h?.get("x-forwarded-host");
  if (host) {
    const proto = h?.get("x-forwarded-proto") ?? (/^(localhost|[\w-]+\.localhost)(:|$)/.test(host) ? "http" : "https");
    return `${proto}://${host}`;
  }
  const club = await getClub().catch(() => null);
  if (club?.domain) return `https://${club.domain}`;
  return (process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function isHttps(): Promise<boolean> {
  return (await baseUrl()).startsWith("https:");
}
