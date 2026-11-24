import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { put } from "@vercel/blob";

// Billeder fra admin og atleter (logoer, profilbilleder). De skaleres ned og gemmes som WebP.
// Med BLOB_READ_WRITE_TOKEN (Vercel Blob) ligger de i klubbens eget billedlager, og databasen gemmer kun adressen.
// Uden (fx lokalt) gemmes de som data-URL i databasen, så alt stadig virker.

const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_UPLOAD_MB = 4; // Vercel tager højst 4,5 MB pr. forespørgsel

export type ImageResult = { ok: true; url: string | null } | { ok: false; error: string };
type Opts = { folder: string; maxWidth: number; allowSvg?: boolean };

export const blobEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;

/** Gemmer en færdig fil og returnerer dens adresse. */
export async function storeFile(path: string, body: Buffer, contentType: string): Promise<string> {
  if (!blobEnabled()) return `data:${contentType};base64,${body.toString("base64")}`;
  const r = await put(path, body, { access: "public", contentType, addRandomSuffix: false, allowOverwrite: true });
  return r.url;
}

/** Skalerer et billede ned til højst maxWidth og laver det om til WebP. */
export async function optimize(input: Buffer, maxWidth: number): Promise<Buffer> {
  return sharp(input, { animated: false }).rotate().resize({ width: maxWidth, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
}

export async function readImage(v: FormDataEntryValue | null, { folder, maxWidth, allowSvg = false }: Opts): Promise<ImageResult> {
  if (!(v instanceof File) || v.size === 0) return { ok: true, url: null };
  const types = allowSvg ? [...TYPES, "image/svg+xml"] : TYPES;
  if (!types.includes(v.type)) return { ok: false, error: `Billedet skal være ${allowSvg ? "PNG, JPG, WebP, GIF eller SVG" : "PNG, JPG, WebP eller GIF"}` };
  if (v.size > MAX_UPLOAD_MB * 1024 * 1024) return { ok: false, error: `Billedet må højst fylde ${MAX_UPLOAD_MB} MB` };
  const raw = Buffer.from(await v.arrayBuffer());
  try {
    if (v.type === "image/svg+xml") {
      // SVG kan indeholde scripts; vi afviser dem, der gør
      if (/<script|\son\w+\s*=|javascript:/i.test(raw.toString("utf8"))) return { ok: false, error: "SVG-filen indeholder kode og kan ikke bruges" };
      return { ok: true, url: await storeFile(`${folder}/${randomUUID()}.svg`, raw, "image/svg+xml") };
    }
    const webp = await optimize(raw, maxWidth);
    return { ok: true, url: await storeFile(`${folder}/${randomUUID()}.webp`, webp, "image/webp") };
  } catch (e) {
    console.error("[upload]", e);
    return { ok: false, error: "Billedet kunne ikke læses. Prøv et andet." };
  }
}
