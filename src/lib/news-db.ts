import { prisma } from "./db";
import { REACTIONS, type Reaction } from "./news";

export type ReactionState = { counts: Partial<Record<Reaction, number>>; mine: Reaction[] };

/** Antal pr. emoji og hvilke man selv har trykket på, for hvert opslag. Navne hentes aldrig. */
export async function reactionsFor(postIds: string[], userId: string): Promise<Map<string, ReactionState>> {
  const out = new Map<string, ReactionState>(postIds.map((id) => [id, { counts: {}, mine: [] }]));
  if (postIds.length === 0) return out;
  const [counts, mine] = await Promise.all([
    prisma.postReaction.groupBy({ by: ["postId", "emoji"], where: { postId: { in: postIds } }, _count: { _all: true } }),
    prisma.postReaction.findMany({ where: { postId: { in: postIds }, userId }, select: { postId: true, emoji: true } }),
  ]);
  for (const c of counts) {
    const s = out.get(c.postId);
    if (s && (REACTIONS as readonly string[]).includes(c.emoji)) s.counts[c.emoji as Reaction] = c._count._all;
  }
  for (const m of mine) out.get(m.postId)?.mine.push(m.emoji as Reaction);
  return out;
}
