import Link from "next/link";
import type { ChatChannel, ChatRoom } from "@prisma/client";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { CHANNELS, CHANNEL_LABEL as CHANNEL_DA, CHANNEL_LABEL_EN, ROOM_LABEL as ROOM_DA, ROOM_LABEL_EN, canDeleteMessage, canPost, isChannel, MAX_LENGTH, roomsFor } from "@/lib/chat";
import { formatDay, formatTime } from "@/lib/time";
import { ChatIcon, DisciplineIcon, initials } from "@/components/Icons";
import { AutoRefresh } from "./AutoRefresh";
import { EmojiButton } from "@/components/EmojiButton";
import { deleteMessage, postMessage } from "./actions";
import { requireFeature } from "@/lib/features";
import { getLocale, translator } from "@/lib/i18n";

export const metadata = { title: "Chat" };

type Props = { searchParams: Promise<{ rum?: string; kanal?: string }> };

export default async function Chat({ searchParams }: Props) {
  await requireFeature("chat");
  const user = await requireUser("/chat");
  const sp = await searchParams;
  const rooms = roomsFor(user);
  const loc = await getLocale();
  const t = translator(loc);
  const CHANNEL_LABEL = loc === "en" ? CHANNEL_LABEL_EN : CHANNEL_DA;
  const ROOM_LABEL = loc === "en" ? ROOM_LABEL_EN : ROOM_DA;

  if (rooms.length === 0) {
    return (
      <>
        <h1>Chat</h1>
        <div className="card empty">{t("Du er ikke i en gruppe endnu. Når klubben har sat dig på et hold, kan du skrive med dit hold her.", "You are not in a group yet. Once the club has put you on a team, you can chat with your team here.")}</div>
      </>
    );
  }

  const room: ChatRoom = rooms.includes(sp.rum as ChatRoom) ? (sp.rum as ChatRoom) : rooms[0];
  const channel: ChatChannel = isChannel(sp.kanal) ? sp.kanal : "SOCIAL";

  const [messages, latest] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { room, channel },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.chatMessage.groupBy({ by: ["channel"], where: { room, deletedAt: null }, _max: { createdAt: true } }),
  ]);
  messages.reverse();
  const lastAt = Object.fromEntries(latest.map((l) => [l.channel, l._max.createdAt]));
  const url = (r: ChatRoom, c: string) => `/chat?rum=${r}&kanal=${c}`;

  let lastDay = "";
  return (
    <div className="chat">
      <AutoRefresh />
      <h1>Chat</h1>
      {rooms.length > 1 && (
        <nav className="filters" aria-label={t("Chatrum", "Chat rooms")}>
          {rooms.map((r) => (
            <Link key={r} href={url(r, channel)} className={r === room ? "active" : undefined} aria-current={r === room ? "page" : undefined}>{ROOM_LABEL[r]}</Link>
          ))}
        </nav>
      )}
      <nav className="chat-channels" aria-label={t("Kanal", "Channel")}>
        {CHANNELS.map((c) => (
          <Link key={c} href={url(room, c)} className={`disc disc-${c === "SOCIAL" ? "OTHER" : c}${c === channel ? " active" : ""}`} aria-current={c === channel ? "page" : undefined}>
            {c === "SOCIAL" ? <span className="disc disc-OTHER disc-icon"><ChatIcon size={18} /></span> : <DisciplineIcon discipline={c} size={18} />}
            <span>{CHANNEL_LABEL[c]}</span>
            {lastAt[c] && c !== channel && <small className="muted">{formatTime(lastAt[c]!, loc)}</small>}
          </Link>
        ))}
      </nav>

      <section className="card chat-log" aria-label={`${ROOM_LABEL[room]} · ${CHANNEL_LABEL[channel]}`}>
        {messages.length === 0 && (
          <p className="empty">{channel === "SOCIAL" ? t("Ingen beskeder endnu. Sig hej, del et billede fra weekendens løb eller foreslå en klubaften.", "No messages yet. Say hi, share a photo from the weekend race or suggest a club night.") : t("Ingen beskeder endnu. Skriv den første, fx om en tur, en aflysning eller et godt råd.", "No messages yet. Write the first one, e.g. about a session, a cancellation or a good tip.")}</p>
        )}
        {messages.map((m) => {
          const day = formatDay(m.createdAt, loc);
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = m.userId === user.id;
          return (
            <div key={m.id}>
              {showDay && <div className="chat-day">{day}</div>}
              <div className={`chat-msg${mine ? " mine" : ""}`}>
                {!mine && <span className="avatar">{initials(m.user.name)}</span>}
                <div className="chat-bubble">
                  {!mine && <b>{m.user.name ?? t("Medlem", "Member")}</b>}
                  {m.deletedAt ? <em className="muted">{t("Beskeden er slettet", "Message deleted")}</em> : <p>{m.body}</p>}
                  <span className="chat-meta">
                    {formatTime(m.createdAt, loc)}
                    {!m.deletedAt && canDeleteMessage(user, m) && (
                      <form action={deleteMessage}>
                        <input type="hidden" name="id" value={m.id} />
                        <button type="submit" className="linklike">{t("Slet", "Delete")}</button>
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

      {canPost(user, room) ? (
      <form action={postMessage} className="chat-form">
        <input type="hidden" name="room" value={room} />
        <input type="hidden" name="channel" value={channel} />
        <label className="sr-only" htmlFor="besked">{t("Besked til", "Message to")} {ROOM_LABEL[room]} · {CHANNEL_LABEL[channel]}</label>
        <textarea id="besked" name="body" rows={2} maxLength={MAX_LENGTH} required placeholder={`${t("Skriv til", "Write to")} ${CHANNEL_LABEL[channel]} · ${ROOM_LABEL[room]}`} />
        <EmojiButton target="besked" />
        <button className="button" type="submit">Send</button>
      </form>
      ) : (
        <p className="notice chat-readonly">{t("Kun børnene kan skrive her. Som træner eller admin kan du læse med og slette beskeder.", "Only the kids can write here. As a coach or admin you can read along and delete messages.")}</p>
      )}
      {room === "BOERN" && canPost(user, room) && <p className="muted" style={{ fontSize: "0.88rem" }}>{t("Kun børnene kan skrive her. Trænerne læser med og kan slette beskeder.", "Only the kids can write here. The coaches read along and can delete messages.")}</p>}
    </div>
  );
}
