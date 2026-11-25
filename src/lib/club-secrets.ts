import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { prismaUnscoped } from "./db-base";
import { currentClub, defaultClubSlug } from "./tenant";

// Indstillinger og nøgler, der er forskellige for hver klub: klubbens egen Stripe-konto, økonomisystem, kontaktmail m.m.
// Standardklubben læser dem fra miljøvariablerne som hidtil. Andre klubber har dem krypteret i Club.secrets
// (AES-256-GCM med CLUB_SECRETS_KEY), sat af platformen med: npm run klub -- noegle <slug> NAVN værdi

export const CLUB_ENV_KEYS = [
  "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
  "ACCOUNTING_PROVIDER", "ACCOUNTING_API_TOKEN",
  "ECONOMIC_APP_SECRET_TOKEN", "ECONOMIC_AGREEMENT_GRANT_TOKEN", "ECONOMIC_JOURNAL_NUMBER", "ECONOMIC_REVENUE_ACCOUNT", "ECONOMIC_CLEARING_ACCOUNT",
  "CONTACT_EMAIL", "CLUB_LANG",
] as const;
export type ClubEnvKey = (typeof CLUB_ENV_KEYS)[number];

function key(): Buffer {
  const k = process.env.CLUB_SECRETS_KEY || process.env.AUTH_SECRET;
  if (!k || k.length < 16) throw new Error("CLUB_SECRETS_KEY mangler (mindst 16 tegn)");
  return createHash("sha256").update(`club-secrets:${k}`).digest();
}

export function encryptSecrets(values: Record<string, string>): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(values), "utf8"), c.final()]);
  return `v1:${Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64")}`;
}

export function decryptSecrets(blob: string | null | undefined): Record<string, string> {
  if (!blob) return {};
  if (!blob.startsWith("v1:")) throw new Error("Ukendt format på klubbens nøgler");
  const raw = Buffer.from(blob.slice(3), "base64");
  const d = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8"));
}

const cache = new Map<string, { values: Record<string, string>; at: number }>();

/** En indstilling for den aktuelle klub (fx STRIPE_SECRET_KEY). undefined, hvis klubben ikke har den. */
export async function clubEnv(name: ClubEnvKey): Promise<string | undefined> {
  const club = await currentClub();
  if (club.slug === defaultClubSlug()) return process.env[name] || undefined;
  let hit = cache.get(club.id);
  if (!hit || Date.now() - hit.at > 60_000) {
    const row = await prismaUnscoped.club.findUnique({ where: { id: club.id }, select: { secrets: true } });
    hit = { values: decryptSecrets(row?.secrets), at: Date.now() };
    cache.set(club.id, hit);
  }
  return hit.values[name] || undefined;
}

/** Sæt eller fjern (tom værdi) en indstilling for en klub. Kun platformen (scripts/klub.ts). */
export async function setClubEnv(clubId: string, name: ClubEnvKey, value: string): Promise<void> {
  const row = await prismaUnscoped.club.findUniqueOrThrow({ where: { id: clubId }, select: { secrets: true } });
  const values = decryptSecrets(row.secrets);
  if (value) values[name] = value;
  else delete values[name];
  await prismaUnscoped.club.update({ where: { id: clubId }, data: { secrets: encryptSecrets(values) } });
  cache.delete(clubId);
}
