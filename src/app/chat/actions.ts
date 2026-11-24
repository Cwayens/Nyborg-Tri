"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { MAX_LENGTH, canDeleteMessage, canUseChat, isChannel } from "@/lib/chat";
import { GROUPS } from "@/lib/roles";
import type { AthleteGroup } from "@prisma/client";

function target(formData: FormData) {
  const group = String(formData.get("group")) as AthleteGroup;
  const channel = formData.get("channel");
  if (!GROUPS.includes(group) || !isChannel(channel)) redirect("/chat");
  return { group, channel: channel as "RUN" | "BIKE" | "SWIM" };
}

export async function postMessage(formData: FormData) {
  const user = await requireUser("/chat");
  const { group, channel } = target(formData);
  const url = `/chat?gruppe=${group}&kanal=${channel}`;
  if (!canUseChat(user, group)) redirect("/chat");
  const body = String(formData.get("body") ?? "").trim().slice(0, MAX_LENGTH);
  if (body) await prisma.chatMessage.create({ data: { group, channel, userId: user.id, body } });
  revalidatePath("/chat");
  redirect(url + "#bund");
}

export async function deleteMessage(formData: FormData) {
  const user = await requireUser("/chat");
  const msg = await prisma.chatMessage.findUnique({ where: { id: String(formData.get("id")) } });
  if (msg && canUseChat(user, msg.group) && canDeleteMessage(user, msg)) {
    await prisma.chatMessage.update({ where: { id: msg.id }, data: { deletedAt: new Date(), deletedById: user.id } });
  }
  revalidatePath("/chat");
  redirect(msg ? `/chat?gruppe=${msg.group}&kanal=${msg.channel}` : "/chat");
}
