import type { AthleteGroup, Prisma } from "@prisma/client";
import { prisma } from "./db";
import { billingEmail } from "./guardian";
import { sendMail } from "./mail";
import { GROUP_LABEL } from "./roles";
import { CLUB } from "@/lib/club";

// Mail til hold og medlemmer. Børn under 18 får mailen gennem deres forælder/værge.

export type Audience = "ALL" | "TRIAL" | "TRAINERS" | `TEAM:${string}` | `GROUP:${AthleteGroup}`;
export type MailKind = "NEWS" | "IMPORTANT";
type AudienceOption = { value: Audience; label: string; trainerAllowed: boolean };

/** Modtagergrupper: alle, hvert aktivt hold, prøvemedlemmer og trænere. */
export async function audiences(): Promise<AudienceOption[]> {
  const teams = await prisma.team.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, name: true, kind: true } });
  return [
    { value: "ALL", label: "Alle aktive medlemmer", trainerAllowed: false },
    ...teams.map((t): AudienceOption => ({ value: `TEAM:${t.id}`, label: `Holdet ${t.name}${t.kind === "BOERN" ? " (sendes til forældre)" : ""}`, trainerAllowed: true })),
    { value: "TRIAL", label: "Medlemmer på prøve", trainerAllowed: false },
    { value: "TRAINERS", label: "Trænere og bestyrelse", trainerAllowed: true },
  ];
}

/** Navn til mailloggen; ældre mails kan være sendt til en gruppe. */
export async function audienceLabel(v: string): Promise<string> {
  if (v.startsWith("GROUP:")) return `${GROUP_LABEL[v.slice(6) as AthleteGroup] ?? v}-holdet`;
  return (await audiences()).find((a) => a.value === v)?.label ?? v;
}

function where(audience: Audience, kind: MailKind, now: Date): Prisma.UserWhereInput {
  const active: Prisma.UserWhereInput = { memberships: { some: { endDate: { gt: now } } } };
  const base: Prisma.UserWhereInput = { deletedAt: null, ...(kind === "NEWS" ? { newsMail: true } : {}) };
  if (audience === "TRAINERS") return { ...base, role: { in: ["TRAINER", "ADMIN"] } };
  if (audience === "TRIAL") return { ...base, memberships: { some: { endDate: { gt: now }, source: "TRIAL" } } };
  if (audience === "ALL") return { ...base, ...active };
  if (audience.startsWith("TEAM:")) return { ...base, ...active, teamId: audience.slice(5) };
  return { ...base, ...active, athleteGroup: audience.slice(6) as AthleteGroup };
}

/** Modtageradresser (unikke). Søskende med samme forælder giver kun én mail. */
export async function recipients(audience: Audience, kind: MailKind, now = new Date()): Promise<string[]> {
  const users = await prisma.user.findMany({ where: where(audience, kind, now), select: { email: true, birthDate: true, guardianEmail: true } });
  return [...new Set(users.map((u) => billingEmail(u, now).toLowerCase()).filter((e) => !e.endsWith(".invalid")))];
}

export function mailFooter(kind: MailKind): string {
  return kind === "NEWS"
    ? `\n\n—\nDu får denne mail, fordi du er medlem af ${CLUB.name}. Vil du ikke have nyheder på mail, kan du slå det fra under Min profil${CLUB.domain ? ` på ${CLUB.domain}` : ""}.`
    : `\n\n—\nVigtig besked fra ${CLUB.name} til medlemmer.`;
}

/** Sender én mail pr. modtager (ingen kan se de andres adresser), fem ad gangen. */
export async function sendBulk(to: string[], subject: string, body: string): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < to.length; i += 5) {
    const r = await Promise.all(to.slice(i, i + 5).map((t) => sendMail(t, subject, body)));
    r.forEach((ok) => (ok ? sent++ : failed++));
  }
  return { sent, failed };
}
