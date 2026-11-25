"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { isReaction } from "@/lib/news";

/** Slå en emoji til eller fra på en nyhed. */
export async function toggleReaction(fd: FormData) {
  const user = await requireUser("/nyheder");
  const postId = String(fd.get("postId") ?? "");
  const emoji = fd.get("emoji");
  if (!isReaction(emoji)) return;
  const post = await prisma.post.findFirst({ where: { id: postId, published: true }, select: { id: true } });
  if (!post) return;
  const key = { postId_userId_emoji: { postId, userId: user.id, emoji } };
  const had = await prisma.postReaction.findUnique({ where: key, select: { id: true } });
  if (had) await prisma.postReaction.delete({ where: key }).catch(() => null);
  else await prisma.postReaction.create({ data: { postId, userId: user.id, emoji } }).catch(() => null); // dobbelttryk: unik nøgle
  revalidatePath("/nyheder", "layout");
  revalidatePath("/min-side");
}
