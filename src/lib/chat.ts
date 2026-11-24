import type { AthleteGroup, Discipline, Role } from "@prisma/client";
import { hasRole } from "./roles";

export const CHANNELS = ["RUN", "BIKE", "SWIM"] as const satisfies readonly Discipline[];
export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_LABEL: Record<Channel, string> = { RUN: "Løb", BIKE: "Cykling", SWIM: "Svøm" };

export function isChannel(v: unknown): v is Channel {
  return typeof v === "string" && (CHANNELS as readonly string[]).includes(v);
}

type U = { role: Role; athleteGroup: AthleteGroup | null };

/** Atleter læser og skriver kun i egen gruppe. Trænere og admin har adgang til alle grupper. */
export function canUseChat(user: U, group: AthleteGroup): boolean {
  return hasRole(user.role, "TRAINER") || user.athleteGroup === group;
}

/** Afsender kan slette egne beskeder, trænere og admin kan slette alle (moderation). */
export function canDeleteMessage(user: U & { id: string }, msg: { userId: string }): boolean {
  return msg.userId === user.id || hasRole(user.role, "TRAINER");
}

export const MAX_LENGTH = 2000;
