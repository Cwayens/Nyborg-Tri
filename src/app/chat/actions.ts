"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { MAX_LENGTH, canDeleteMessage, canUseChat, isChannel, isRoom } from "@/lib/chat";

export async function postMessage(formData: FormData) {
  const user = await requireUser("/chat");
  const room = formData.get("room");
  const channel = formData.get("channel");
  if (!isRoom(room) || !isChannel(channel) || !canUseChat(user, room)) redirect("/chat");
  const body = String(formData.get("body") ?? "").trim().slice(0, MAX_LENGTH);
  if (body) await prisma.chatMessage.create({ data: { room, channel, userId: user.id, body } });
  revalidatePath("/chat");
  redirect(`/chat?rum=${room}&kanal=${channel}#bund`);
}

export async function deleteMessage(formData: FormData) {
  const user = await requireUser("/chat");
  const msg = await prisma.chatMessage.findUnique({ where: { id: String(formData.get("id")) } });
  if (msg && canUseChat(user, msg.room) && canDeleteMessage(user, msg)) {
    await prisma.chatMessage.update({ where: { id: msg.id }, data: { deletedAt: new Date(), deletedById: user.id } });
  }
  revalidatePath("/chat");
  redirect(msg ? `/chat?rum=${msg.room}&kanal=${msg.channel}` : "/chat");
}
