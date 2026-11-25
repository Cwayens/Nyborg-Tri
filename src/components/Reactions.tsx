import { toggleReaction } from "@/app/nyheder/actions";
import { REACTIONS } from "@/lib/news";
import type { ReactionState } from "@/lib/news-db";
import { translator, type Locale } from "@/lib/i18n-core";

/** Emoji-knapper under en nyhed. Viser kun antal, ikke hvem der har trykket. */
export function Reactions({ postId, state, loc = "da", dark }: { postId: string; state?: ReactionState; loc?: Locale; dark?: boolean }) {
  const t = translator(loc);
  return (
    <form action={toggleReaction} className={`reactions${dark ? " dark" : ""}`} aria-label={t("Reager på nyheden", "React to the post")}>
      <input type="hidden" name="postId" value={postId} />
      {REACTIONS.map((e) => {
        const n = state?.counts[e] ?? 0;
        const on = state?.mine.includes(e) ?? false;
        return (
          <button key={e} type="submit" name="emoji" value={e} className={on ? "on" : undefined} aria-pressed={on}
            aria-label={`${e} ${n}${on ? t(", du har trykket", ", you reacted") : ""}`}>
            <span aria-hidden="true">{e}</span>{n > 0 && <small>{n}</small>}
          </button>
        );
      })}
    </form>
  );
}
