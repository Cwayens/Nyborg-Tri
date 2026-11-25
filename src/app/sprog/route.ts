import { NextResponse } from "next/server";
import { isLocale } from "@/lib/i18n-core";

// Skift sprog: /sprog?l=en&til=/kalender. Gemmes i en cookie i et år. Kun interne stier som "til".
export async function GET(req: Request) {
  const url = new URL(req.url);
  const l = url.searchParams.get("l");
  const to = url.searchParams.get("til") ?? "/";
  const safe = /^\/(?!\/)[^\s\\]*$/.test(to) ? to : "/";
  const res = NextResponse.redirect(new URL(safe, url.origin), 303);
  if (isLocale(l)) res.cookies.set("lang", l, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax" });
  return res;
}
