import { cache } from "react";
import { redirect } from "next/navigation";
import type { Duty, Role } from "@prisma/client";
import { prisma } from "./db";
import { hasRole } from "./roles";

// Roller ud over atlet, træner og admin:
// - Holdleder (Team.leaders): opretter og retter træninger og skriver mail for sine egne hold. Kun voksenhold (børnehold ledes af trænere).
// - Kasserer (Duty TREASURER): økonomimodulet (posteringer, budget, restancer, eksport), betalinger, medlemstyper og
//   medlemslisten (CSV), uden resten af administrationen.
// - Frivillig (Duty VOLUNTEER): står på listen over frivillige og kan få mail som frivillig.

export const DUTY_LABEL: Record<Duty, string> = { TREASURER: "Kasserer", VOLUNTEER: "Frivillig" };
export const DUTIES = Object.keys(DUTY_LABEL) as Duty[];

export type Staff = { id: string; name: string | null; email: string; role: Role; duties: Duty[]; leads: string[] };

/** Rolle, ekstra roller og hold, man leder. Slået op i databasen én gang pr. forespørgsel. */
export const staffOf = cache(async (userId: string | null | undefined): Promise<Staff | null> => {
  if (!userId) return null;
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, duties: true, deletedAt: true, leads: { where: { active: true }, select: { id: true } } },
  });
  if (!u || u.deletedAt) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role, duties: u.duties, leads: u.leads.map((t) => t.id) };
});

export const isTreasurer = (s: Staff | null) => !!s && (s.role === "ADMIN" || s.duties.includes("TREASURER"));
export const isTeamStaff = (s: Staff | null) => !!s && (hasRole(s.role, "TRAINER") || s.leads.length > 0);

/** Må personen oprette og rette træninger for holdet? Trænere og admin: alle hold. Holdledere: egne hold. */
export function canManageTeam(s: Staff, teamId: string | null | undefined): boolean {
  return hasRole(s.role, "TRAINER") || (!!teamId && s.leads.includes(teamId));
}

async function current(callbackUrl: string): Promise<Staff> {
  const { auth } = await import("@/auth");
  const id = (await auth())?.user?.id;
  if (!id) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  const s = await staffOf(id);
  if (!s) redirect("/min-side");
  return s;
}

/** Kasserer eller admin. */
export async function requireTreasurer(callbackUrl = "/admin/oekonomi"): Promise<Staff> {
  const s = await current(callbackUrl);
  if (!isTreasurer(s)) redirect("/min-side");
  return s;
}

/** Træner, admin eller holdleder. */
export async function requireTeamStaff(callbackUrl = "/traener"): Promise<Staff> {
  const s = await current(callbackUrl);
  if (!isTeamStaff(s)) redirect("/min-side");
  return s;
}
