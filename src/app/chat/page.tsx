import Link from "next/link";
import type { AthleteGroup } from "@prisma/client";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { CHANNELS, CHANNEL_LABEL, canDeleteMessage, canUseChat, isChannel, MAX_LENGTH } from "@/lib/chat";
import { GROUPS, GROUP_LABEL, hasRole } from "@/lib/roles";
import { formatDay, formatTime } from "@/lib/time";
import { DisciplineIcon, initials } from "@/components/Icons";
import { AutoRefresh } from "./AutoRefresh";
import { deleteMessage, postMessage } from "./actions";

export const metadata = { title: "Chat" };

type Props = { searchParams: Promise<{ gruppe?: string; kanal?: string }> };

export default async function Chat({ searchParams }: Props) {
  const user = await requireUser("/chat");
  const sp = await searchParams;
  const trainer = hasRole(user.role, "TRAINER");
  const groups = trainer ? GROUPS : user.athleteGroup ? [user.athleteGroup] : [];

  if (groups.length === 0) {
    return (
      <>
        <h1>Chat</h1>
        <div className="card empty">Du er ikke i en gruppe endnu. Når klubben har sat dig i Elite, Bredde eller Børn, kan du skrive med din gruppe her.</div>
      </>
    );
  }

  const group: AthleteGroup = groups.includes(sp.gruppe as AthleteGroup) ? (sp.gruppe as AthleteGroup) : groups[0];
  const channel = isChannel(sp.kanal) ? sp.kanal : "RUN";
  if (!canUseChat(user, group)) return null;

  const [messages, latest] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { group, channel },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.chatMessage.groupBy({ by: ["channel"], where: { group, deletedAt: null }, _max: { createdAt: true } }),
  ]);
  messages.reverse();
  const lastAt = Object.fromEntries(latest.map((l) => [l.channel, l._max.createdAt]));
  const url = (g: AthleteGroup, c: string) => `/chat?gruppe=${g}&kanal=${c}`;

  let lastDay = "";
  return (
    <div className="chat">
      <AutoRefresh />
      <h1>Chat</h1>
      {groups.length > 1 && (
        <nav className="filters" aria-label="Gruppe">
          {groups.map((g) => (
            <Link key={g} href={url(g, channel)} className={g === group ? "active" : undefined} aria-current={g === group ? "page" : undefined}>{GROUP_LABEL[g]}</Link>
          ))}
        </nav>
      )}
      <nav className="chat-channels" aria-label="Kanal">
        {CHANNELS.map((c) => (
          <Link key={c} href={url(group, c)} className={`disc disc-${c}${c === channel ? " active" : ""}`} aria-current={c === channel ? "page" : undefined}>
            <DisciplineIcon discipline={c} size={18} />
            <span>{CHANNEL_LABEL[c]}</span>
            {lastAt[c] && c !== channel && <small className="muted">{formatTime(lastAt[c]!)}</small>}
          </Link>
        ))}
      </nav>

      <section className="card chat-log" aria-label={`${GROUP_LABEL[group]} · ${CHANNEL_LABEL[channel]}`}>
        {messages.length === 0 && (
          <p className="empty">Ingen beskeder endnu. Skriv den første, fx om en tur, en aflysning eller et godt råd.</p>
        )}
        {messages.map((m) => {
          const day = formatDay(m.createdAt);
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = m.userId === user.id;
          return (
            <div key={m.id}>
              {showDay && <div className="chat-day">{day}</div>}
              <div className={`chat-msg${mine ? " mine" : ""}`}>
                {!mine && <span className="avatar">{initials(m.user.name)}</span>}
                <div className="chat-bubble">
                  {!mine && <b>{m.user.name ?? "Medlem"}</b>}
                  {m.deletedAt ? <em className="muted">Beskeden er slettet</em> : <p>{m.body}</p>}
                  <span className="chat-meta">
                    {formatTime(m.createdAt)}
                    {!m.deletedAt && canDeleteMessage(user, m) && (
                      <form action={deleteMessage}>
                        <input type="hidden" name="id" value={m.id} />
                        <button type="submit" className="linklike">Slet</button>
                      </form>
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div id="bund" />
      </section>

      <form action={postMessage} className="chat-form">
        <input type="hidden" name="group" value={group} />
        <input type="hidden" name="channel" value={channel} />
        <label className="sr-only" htmlFor="besked">Besked til {GROUP_LABEL[group]} · {CHANNEL_LABEL[channel]}</label>
        <textarea id="besked" name="body" rows={2} maxLength={MAX_LENGTH} required placeholder={`Skriv til ${GROUP_LABEL[group]} · ${CHANNEL_LABEL[channel]}`} />
        <button className="button" type="submit">Send</button>
      </form>
      {group === "BOERN" && <p className="muted" style={{ fontSize: "0.88rem" }}>Børnegruppens chat følges af trænerne, som kan slette beskeder.</p>}
    </div>
  );
}
