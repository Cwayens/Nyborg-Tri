import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { del, list, put } from "@vercel/blob";
import { prisma } from "./db";

// Daglig sikkerhedskopi af hele databasen som krypteret fil i billedlageret (Vercel Blob).
// Filen krypteres med BACKUP_KEY (AES-256-GCM), så den ikke kan læses af andre, selv om adressen skulle slippe ud.
// Neon har desuden selv gendannelse til et tidspunkt (point-in-time restore); den er første valg ved uheld.

const KEEP_DAYS = 30;
const PREFIX = "backup/";

// Login-sessioner er udeladt (de skal ikke gendannes). Alle tabeller i den rækkefølge, de skal lægges tilbage i (forældre før børn)
const TABLES = [
  "user", "account", "membershipType", "membership", "payment", "page", "post",
  "trainingSession", "trainingSignup", "trialRequest", "accessCode", "wearableConnection", "activity", "groupWorkout",
  "groupWorkoutParticipant", "effort", "benchmarkResult", "chatMessage", "sponsor", "athleteProfile", "contactPerson",
  "contactMessage", "mailLog",
] as const;

function key(): Buffer {
  const k = process.env.BACKUP_KEY;
  if (!k || k.length < 16) throw new Error("BACKUP_KEY mangler (mindst 16 tegn)");
  return createHash("sha256").update(k).digest();
}

export function encrypt(data: Buffer): Buffer {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(data), c.final()]);
  return Buffer.concat([Buffer.from("NTB1"), iv, c.getAuthTag(), enc]);
}

export function decrypt(file: Buffer): Buffer {
  if (file.subarray(0, 4).toString() !== "NTB1") throw new Error("Ikke en NyborgTri-backup");
  const iv = file.subarray(4, 16);
  const tag = file.subarray(16, 32);
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(file.subarray(32)), d.final()]);
}

export async function dumpDatabase(): Promise<Record<string, unknown[]>> {
  const out: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    const model = (prisma as unknown as Record<string, { findMany: () => Promise<unknown[]> } | undefined>)[t];
    if (model) out[t] = await model.findMany();
  }
  return out;
}

/** Laver dagens backup og sletter dem, der er ældre end 30 dage. */
export async function runBackup(now = new Date()) {
  const data = await dumpDatabase();
  const rows = Object.values(data).reduce((s, v) => s + v.length, 0);
  const file = encrypt(gzipSync(Buffer.from(JSON.stringify({ createdAt: now.toISOString(), data }))));
  const name = `${PREFIX}${now.toISOString().slice(0, 10)}-${randomBytes(8).toString("hex")}.ntb`;
  const { url } = await put(name, file, { access: "public", contentType: "application/octet-stream", addRandomSuffix: false });
  const cutoff = now.getTime() - KEEP_DAYS * 86400_000;
  const old = (await list({ prefix: PREFIX })).blobs.filter((b) => b.uploadedAt.getTime() < cutoff).map((b) => b.url);
  if (old.length) await del(old);
  return { url, rows, bytes: file.length, deleted: old.length };
}

export async function listBackups() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];
  return (await list({ prefix: PREFIX })).blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
}

export function readBackup(file: Buffer): { createdAt: string; data: Record<string, unknown[]> } {
  return JSON.parse(gunzipSync(decrypt(file)).toString("utf8"));
}
