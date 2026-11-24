import type { AthleteGroup, ChatChannel, ChatRoom, Role } from "@prisma/client";
import { hasRole } from "./roles";

export const CHANNELS = ["RUN", "BIKE", "SWIM", "SOCIAL"] as const satisfies readonly ChatChannel[];
export const CHANNEL_LABEL: Record<ChatChannel, string> = { RUN: "Løb", BIKE: "Cykling", SWIM: "Svøm", SOCIAL: "Social" };
export const ROOMS = ["VOKSNE", "BOERN"] as const satisfies readonly ChatRoom[];
export const ROOM_LABEL: Record<ChatRoom, string> = { VOKSNE: "Elite og Bredde", BOERN: "Børn" };

export function isChannel(v: unknown): v is ChatChannel {
  return typeof v === "string" && (CHANNELS as readonly string[]).includes(v);
}
export function isRoom(v: unknown): v is ChatRoom {
  return typeof v === "string" && (ROOMS as readonly string[]).includes(v);
}

type U = { role: Role; athleteGroup: AthleteGroup | null };

/** Elite og Bredde deler chat. Børn har deres egen. */
export function roomFor(group: AthleteGroup | null): ChatRoom | null {
  return group === "BOERN" ? "BOERN" : group ? "VOKSNE" : null;
}

/** Hvilke chatrum må brugeren bruge? Trænere og admin har adgang til begge. */
export function roomsFor(user: U): ChatRoom[] {
  if (hasRole(user.role, "TRAINER")) return [...ROOMS];
  const r = roomFor(user.athleteGroup);
  return r ? [r] : [];
}

export function canUseChat(user: U, room: ChatRoom): boolean {
  return roomsFor(user).includes(room);
}

/**
 * Må brugeren skrive i rummet? Børn skriver kun med børn: trænere og admin kan læse og slette i børnenes chat,
 * men ikke skrive. I Elite og Bredde kan alle med adgang skrive.
 */
export function canPost(user: U, room: ChatRoom): boolean {
  if (!canUseChat(user, room)) return false;
  if (room === "BOERN") return user.role === "ATHLETE" && user.athleteGroup === "BOERN";
  return true;
}

/** Afsender kan slette egne beskeder, trænere og admin kan slette alle (moderation). */
export function canDeleteMessage(user: U & { id: string }, msg: { userId: string }): boolean {
  return msg.userId === user.id || hasRole(user.role, "TRAINER");
}

export const MAX_LENGTH = 2000;
