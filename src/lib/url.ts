import { headers } from "next/headers";

/** Sidens adresse: AUTH_URL hvis sat, ellers udledt af forespørgslen (fx på Vercel). */
export async function baseUrl(): Promise<string> {
  if (process.env.AUTH_URL) return process.env.AUTH_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function isHttps(): Promise<boolean> {
  return (await baseUrl()).startsWith("https:");
}
