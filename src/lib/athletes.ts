import type { Prisma } from "@prisma/client";

/** Profiler, der må vises offentligt: admin har slået dem til, atleten har givet samtykke, og atleten er i Elite. */
export const VISIBLE_ATHLETE: Prisma.AthleteProfileWhereInput = {
  published: true,
  consentAt: { not: null },
  user: { athleteGroup: "ELITE" },
};

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 60) || "atlet";
}

/** Tekstfelt med én ting pr. linje → liste. */
export function lines(text: string | null | undefined): string[] {
  return (text ?? "").split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
}

export function instagramUrl(handle: string | null | undefined): string | null {
  const h = (handle ?? "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "");
  return /^[\w.]{1,30}$/.test(h) ? `https://www.instagram.com/${h}/` : null;
}
