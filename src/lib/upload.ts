// Små billeder (logoer, profilbilleder) gemmes som data-URL i databasen, så der ikke skal sættes fillager op.
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export type ImageResult = { ok: true; dataUrl: string | null } | { ok: false; error: string };

export async function readImage(v: FormDataEntryValue | null, maxKb: number, allowSvg = false): Promise<ImageResult> {
  if (!(v instanceof File) || v.size === 0) return { ok: true, dataUrl: null };
  const types = allowSvg ? [...TYPES, "image/svg+xml"] : TYPES;
  if (!types.includes(v.type)) return { ok: false, error: `Billedet skal være ${allowSvg ? "PNG, JPG, WebP, GIF eller SVG" : "PNG, JPG, WebP eller GIF"}` };
  if (v.size > maxKb * 1024) return { ok: false, error: `Billedet må højst fylde ${maxKb} KB. Gør det mindre, fx 800 pixel bredt` };
  return { ok: true, dataUrl: `data:${v.type};base64,${Buffer.from(await v.arrayBuffer()).toString("base64")}` };
}
